'use server';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import { revalidatePath } from 'next/cache';
function slugify(value:string){return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'article'}
export async function saveKnowledgeArticleAction(formData:FormData){
 const {user,membership}=await requireMembership(); if(!['admin','support_agent'].includes(membership.role)) throw new Error('Not permitted.');
 const title=String(formData.get('title')||'').trim(),category=String(formData.get('category')||'general').trim(),body=String(formData.get('body')||'').trim(),id=String(formData.get('articleId')||'');
 if(!title||!body||title.length>180||category.length>80||body.length>15000) throw new Error('Complete the title, category and article body within the permitted lengths.');
 const slug=slugify(title);
 if(id){
  await db`update support.knowledge_articles set title=${title},slug=${slug},category=${category},body=${body},updated_by=${user.id},updated_at=now() where id=${id} and workspace_id=${membership.workspace_id}`;
 }else{
  await db`insert into support.knowledge_articles(workspace_id,title,slug,category,body,created_by,updated_by) values(${membership.workspace_id},${title},${slug},${category},${body},${user.id},${user.id})`;
 }
 revalidatePath('/dashboard/knowledge');
}
export async function setKnowledgeStatusAction(formData:FormData){
 const {user,membership}=await requireMembership(); if(membership.role!=='admin') throw new Error('Only admins can publish or archive knowledge articles.');
 const id=String(formData.get('articleId')||''),status=String(formData.get('status')||'');
 if(!id||!['draft','published','archived'].includes(status)) throw new Error('Invalid article status.');
 await db`update support.knowledge_articles set status=${status},published_at=case when ${status}='published' then coalesce(published_at,now()) else published_at end,updated_by=${user.id},updated_at=now() where id=${id} and workspace_id=${membership.workspace_id}`;
 revalidatePath('/dashboard/knowledge');
}
