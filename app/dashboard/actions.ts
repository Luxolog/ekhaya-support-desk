'use server';

import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTicketAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (membership.role === 'customer') redirect('/portal');
  const subject = String(formData.get('subject') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const customerName = String(formData.get('customerName') || '').trim();
  const customerEmail = String(formData.get('customerEmail') || '').trim().toLowerCase();
  const priority = String(formData.get('priority') || 'normal');
  if (!subject || !description || !customerName || !customerEmail) throw new Error('Complete all required ticket fields.');
  if (subject.length > 180 || description.length > 10000 || customerName.length > 160 || customerEmail.length > 320) throw new Error('One or more fields exceed the allowed length.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error('Enter a valid customer email address.');
  if (!['low','normal','high','urgent'].includes(priority)) throw new Error('Invalid priority.');
  const customerRows = await db`
    insert into support.customers (workspace_id, display_name, email)
    values (${membership.workspace_id}, ${customerName}, ${customerEmail})
    on conflict (workspace_id, email) do update set display_name = excluded.display_name, updated_at = now()
    returning id
  `;
  const ticketRows = await db`
    with locked_workspace as (
      select id from support.workspaces where id = ${membership.workspace_id} for update
    ),
    next_number as (
      select coalesce(max(ticket_number), 0) + 1 as ticket_number
      from support.tickets
      where workspace_id = (select id from locked_workspace)
    )
    insert into support.tickets (workspace_id, ticket_number, customer_id, subject, description, priority, source)
    select (select id from locked_workspace), next_number.ticket_number, ${customerRows[0].id}, ${subject}, ${description}, ${priority}, 'web'
    from next_number
    returning id, ticket_number
  `;
  await db`
    insert into support.ticket_events (ticket_id, actor_user_id, event_type, new_value)
    values (${ticketRows[0].id}, ${user.id}, 'ticket_created', jsonb_build_object('status','open','priority',${priority}))
  `;
  revalidatePath('/dashboard');
  redirect(`/dashboard/tickets/${ticketRows[0].id}`);
}

export async function updateTicketStatusAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
  const id = String(formData.get('ticketId') || '');
  const status = String(formData.get('status') || '');
  if (!['open','in_progress','waiting_on_customer','resolved','closed'].includes(status)) throw new Error('Invalid status.');
  const previous = await db`select status from support.tickets where id = ${id} and workspace_id = ${membership.workspace_id} limit 1`;
  if (!previous.length) throw new Error('Ticket not found.');
  await db`
    update support.tickets set status = ${status},
      resolved_at = case when ${status} in ('resolved','closed') then coalesce(resolved_at, now()) else null end,
      closed_at = case when ${status} = 'closed' then coalesce(closed_at, now()) else null end,
      updated_at = now()
    where id = ${id} and workspace_id = ${membership.workspace_id}
  `;
  await db`
    insert into support.ticket_events (ticket_id, actor_user_id, event_type, old_value, new_value)
    values (${id}, ${user.id}, 'status_changed', jsonb_build_object('status',${previous[0].status}), jsonb_build_object('status',${status}))
  `;
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/tickets/${id}`);
}

export async function updateTicketPriorityAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (!['admin', 'support_agent'].includes(membership.role)) throw new Error('Not permitted.');
  const id = String(formData.get('ticketId') || '');
  const priority = String(formData.get('priority') || '');
  if (!['low', 'normal', 'high', 'urgent'].includes(priority)) throw new Error('Invalid priority.');
  const previous = await db`select priority from support.tickets where id = ${id} and workspace_id = ${membership.workspace_id} limit 1`;
  if (!previous.length) throw new Error('Ticket not found.');
  if (previous[0].priority === priority) return;
  await db`update support.tickets set priority = ${priority}, updated_at = now() where id = ${id} and workspace_id = ${membership.workspace_id}`;
  await db`
    insert into support.ticket_events (ticket_id, actor_user_id, event_type, old_value, new_value)
    values (${id}, ${user.id}, 'priority_changed', jsonb_build_object('priority', ${previous[0].priority}), jsonb_build_object('priority', ${priority}))
  `;
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/tickets/${id}`);
}

export async function addTicketMessageAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  const id = String(formData.get('ticketId') || '');
  const body = String(formData.get('body') || '').trim();
  const internal = formData.get('internal') === 'on';

  if (!id || !body) throw new Error('Ticket and message are required.');
  if (body.length > 10000) throw new Error('Messages must be 10,000 characters or fewer.');
  if (internal && !['admin', 'support_agent'].includes(membership.role)) {
    throw new Error('Not permitted.');
  }

  const ticket = await db`
    select t.id, t.status, c.user_id as customer_user_id
    from support.tickets t
    join support.customers c
      on c.id = t.customer_id and c.workspace_id = t.workspace_id
    where t.id = ${id}
      and t.workspace_id = ${membership.workspace_id}
    limit 1
  `;

  if (!ticket.length) throw new Error('Ticket not found.');
  if (membership.role === 'customer') {
    if (ticket[0].customer_user_id !== user.id || internal) {
      throw new Error('You can only reply to your own tickets.');
    }
  } else if (!['admin', 'support_agent'].includes(membership.role)) {
    throw new Error('Not permitted.');
  }

  await db`
    insert into support.ticket_messages
      (ticket_id, sender_user_id, sender_type, body, is_internal_note)
    values (
      ${id},
      ${user.id},
      ${membership.role === 'customer' ? 'customer' : 'agent'},
      ${body},
      ${internal}
    )
  `;

  await db`
    update support.tickets
    set updated_at = now(),
        status = case
          when ${membership.role === 'customer'} and status = 'waiting_on_customer'
            then 'in_progress'
          else status
        end
    where id = ${id} and workspace_id = ${membership.workspace_id}
  `;

  await db`
    insert into support.ticket_events (ticket_id, actor_user_id, event_type, new_value)
    values (
      ${id},
      ${user.id},
      ${internal ? 'internal_note_added' : 'reply_added'},
      jsonb_build_object('message', 'added')
    )
  `;

  revalidatePath(`/dashboard/tickets/${id}`);
  revalidatePath('/dashboard');
  revalidatePath('/portal');
}

export async function addWorkspaceMemberAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (membership.role !== 'admin') throw new Error('Only workspace admins can manage members.');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'support_agent');
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['support_agent','customer'].includes(role)) throw new Error('Enter a valid email and role.');
  const found = await db`select id, name, email from neon_auth."user" where lower(email)=${email} limit 1`;
  if (!found.length) throw new Error('That person must register first. Ask them to create an account, then add their registered email here.');
  await db`
    insert into support.workspace_members (workspace_id,user_id,role,is_active)
    values (${membership.workspace_id},${found[0].id},${role},true)
    on conflict (workspace_id,user_id) do update set role=excluded.role,is_active=true
  `;
  if (role === 'customer') {
    await db`
      insert into support.customers (workspace_id,user_id,display_name,email)
      values (${membership.workspace_id},${found[0].id},${found[0].name || found[0].email},${found[0].email})
      on conflict (workspace_id,email) do update set user_id=excluded.user_id,updated_at=now()
    `;
  }
  revalidatePath('/dashboard');
}


export async function manageWorkspaceMemberAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (membership.role !== 'admin') throw new Error('Only workspace admins can manage members.');

  const memberId = String(formData.get('memberId') || '');
  const memberAction = String(formData.get('memberAction') || 'update_role');
  const role = String(formData.get('role') || '');

  if (!memberId || memberId === user.id) {
    throw new Error('You cannot change your own workspace membership here.');
  }

  const target = await db`
    select user_id, role, is_active
    from support.workspace_members
    where workspace_id = ${membership.workspace_id} and user_id = ${memberId}
    limit 1
  `;
  if (!target.length) throw new Error('Workspace member not found.');

  if (memberAction === 'deactivate') {
    if (!target[0].is_active) return;
    if (target[0].role === 'admin') {
      const admins = await db`
        select count(*)::int as total
        from support.workspace_members
        where workspace_id = ${membership.workspace_id}
          and role = 'admin' and is_active = true
      `;
      if (admins[0].total <= 1) throw new Error('A workspace must keep at least one active administrator.');
    }
    await db`
      insert into support.ticket_events (ticket_id, actor_user_id, event_type, old_value, new_value)
      select t.id, ${user.id}, 'assignment_changed',
             jsonb_build_object('assigned_to', ${memberId}),
             jsonb_build_object('assigned_to', null, 'reason', 'member_deactivated')
      from support.tickets t
      where t.workspace_id = ${membership.workspace_id} and t.assigned_to = ${memberId}
    `;
    await db`
      update support.tickets
      set assigned_to = null, updated_at = now()
      where workspace_id = ${membership.workspace_id} and assigned_to = ${memberId}
    `;
    await db`
      update support.workspace_members
      set is_active = false
      where workspace_id = ${membership.workspace_id} and user_id = ${memberId}
    `;
  } else {
    if (!['admin', 'support_agent', 'customer'].includes(role)) {
      throw new Error('Choose a valid workspace role.');
    }
    if (target[0].role === 'admin' && role !== 'admin') {
      const admins = await db`
        select count(*)::int as total
        from support.workspace_members
        where workspace_id = ${membership.workspace_id}
          and role = 'admin' and is_active = true
      `;
      if (admins[0].total <= 1) throw new Error('A workspace must keep at least one active administrator.');
    }
    await db`
      update support.workspace_members
      set role = ${role}, is_active = true
      where workspace_id = ${membership.workspace_id} and user_id = ${memberId}
    `;
    if (role === 'customer') {
      await db`
        insert into support.customers (workspace_id, user_id, display_name, email)
        select ${membership.workspace_id}, u.id, coalesce(u.name, u.email), u.email
        from neon_auth."user" u
        where u.id = ${memberId}
        on conflict (workspace_id, email)
        do update set user_id = excluded.user_id, updated_at = now()
      `;
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/portal');
}

export async function createCustomerTicketAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (membership.role !== 'customer') throw new Error('Customer account required.');
  const subject=String(formData.get('subject')||'').trim();
  const description=String(formData.get('description')||'').trim();
  if(!subject||!description) throw new Error('Complete the subject and description.');
  if(subject.length>180||description.length>10000) throw new Error('Subject must be 180 characters or fewer and description 10,000 characters or fewer.');
  const customer=await db`select id from support.customers where workspace_id=${membership.workspace_id} and user_id=${user.id} limit 1`;
  if(!customer.length) throw new Error('Customer profile not found. Contact the workspace administrator.');
  const ticket=await db`
    with locked_workspace as (
      select id from support.workspaces where id = ${membership.workspace_id} for update
    ),
    next_number as (
      select coalesce(max(ticket_number), 0) + 1 as ticket_number
      from support.tickets
      where workspace_id = (select id from locked_workspace)
    )
    insert into support.tickets (workspace_id,ticket_number,customer_id,subject,description,source)
    select (select id from locked_workspace),next_number.ticket_number,${customer[0].id},${subject},${description},'web'
    from next_number returning id,ticket_number
  `;
  await db`insert into support.ticket_events (ticket_id,actor_user_id,event_type) values (${ticket[0].id},${user.id},'ticket_created')`;
  revalidatePath('/portal');
  redirect('/portal');
}

export async function assignTicketAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
  const id=String(formData.get('ticketId')||'');
  const assignee=String(formData.get('assignee')||'');
  const valid=await db`
    select user_id from support.workspace_members
    where workspace_id=${membership.workspace_id} and user_id=${assignee}
      and role in ('admin','support_agent') and is_active=true limit 1
  `;
  if(assignee && !valid.length) throw new Error('Select an active member of this workspace.');
  const ticket=await db`select id,assigned_to from support.tickets where id=${id} and workspace_id=${membership.workspace_id} limit 1`;
  if(!ticket.length) throw new Error('Ticket not found.');
  await db`update support.tickets set assigned_to=${assignee||null},updated_at=now() where id=${id} and workspace_id=${membership.workspace_id}`;
  await db`
    insert into support.ticket_events (ticket_id,actor_user_id,event_type,old_value,new_value)
    values (${id},${user.id},'assignment_changed',jsonb_build_object('assigned_to',${ticket[0].assigned_to}),jsonb_build_object('assigned_to',${assignee||null}))
  `;
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/tickets/${id}`);
}
