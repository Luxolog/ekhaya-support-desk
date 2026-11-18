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
  if (!['low','normal','high','urgent'].includes(priority)) throw new Error('Invalid priority.');
  const customerRows = await db`
    insert into support.customers (workspace_id, display_name, email)
    values (${membership.workspace_id}, ${customerName}, ${customerEmail})
    on conflict (workspace_id, email) do update set display_name = excluded.display_name, updated_at = now()
    returning id
  `;
  const ticketRows = await db`
    insert into support.tickets (workspace_id, customer_id, subject, description, priority, source)
    values (${membership.workspace_id}, ${customerRows[0].id}, ${subject}, ${description}, ${priority}, 'web')
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

export async function addTicketMessageAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  const id = String(formData.get('ticketId') || '');
  const body = String(formData.get('body') || '').trim();
  const internal = formData.get('internal') === 'on';
  if (!body) throw new Error('Message cannot be empty.');
  if (internal && !['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
  const ticket = await db`select id from support.tickets where id = ${id} and workspace_id = ${membership.workspace_id} limit 1`;
  if (!ticket.length) throw new Error('Ticket not found.');
  await db`
    insert into support.ticket_messages (ticket_id, sender_user_id, sender_type, body, is_internal_note)
    values (${id}, ${user.id}, ${membership.role === 'customer' ? 'customer' : 'agent'}, ${body}, ${internal})
  `;
  await db`update support.tickets set updated_at = now() where id = ${id}`;
  await db`
    insert into support.ticket_events (ticket_id, actor_user_id, event_type, new_value)
    values (${id}, ${user.id}, ${internal ? 'internal_note_added' : 'reply_added'}, jsonb_build_object('message','added'))
  `;
  revalidatePath(`/dashboard/tickets/${id}`);
  revalidatePath('/portal');
}

export async function addAgentAction(formData: FormData) {
  const { user, membership } = await requireMembership();
  if (membership.role !== 'admin') throw new Error('Only workspace admins can add team members.');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) throw new Error('Enter the team member email.');
  const found = await db`select id from neon_auth."user" where lower(email)=${email} limit 1`;
  if (!found.length) throw new Error('That person must create an Ekhaya Support Desk account first. Then add their registered email here.');
  await db`
    insert into support.workspace_members (workspace_id,user_id,role,is_active)
    values (${membership.workspace_id},${found[0].id},'support_agent',true)
    on conflict (workspace_id,user_id) do update set role='support_agent',is_active=true
  `;
  await db`
    insert into support.ticket_events (ticket_id,actor_user_id,event_type,new_value)
    select t.id,${user.id},'team_member_added',jsonb_build_object('email',${email})
    from support.tickets t where t.workspace_id=${membership.workspace_id} order by t.created_at desc limit 1
  `;
  revalidatePath('/dashboard');
}
