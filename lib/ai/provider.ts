export type AiDraftInput={task:'support_reply'|'admissions_reply'|'campaign'|'social_caption';prompt:string;approvedKnowledge:Array<{title:string;body:string}>};
export type AiDraftResult={text:string;provider:'mock';requiresHumanReview:true;sources:string[]};
export interface AiProvider{draft(input:AiDraftInput):Promise<AiDraftResult>}
/** Deterministic zero-cost pilot provider. It is not a live language model. */
export class MockAiProvider implements AiProvider{
 async draft(input:AiDraftInput):Promise<AiDraftResult>{
  const sources=input.approvedKnowledge.map(x=>x.title), context=input.approvedKnowledge.map(x=>`${x.title}: ${x.body.slice(0,1200)}`).join('\n\n');
  const text=context?`DRAFT — HUMAN REVIEW REQUIRED\n\nEnquiry: ${input.prompt.trim().slice(0,3000)}\n\nApproved information:\n${context}\n\nVerify all fees, dates, requirements and policies with authorised staff before sending.`:`DRAFT — HUMAN REVIEW REQUIRED\n\nEnquiry: ${input.prompt.trim().slice(0,3000)}\n\nNo approved knowledge articles were supplied. Refer this enquiry to authorised staff. Do not guess fees, dates, admission requirements or policies.`;
  return {text,provider:'mock',requiresHumanReview:true,sources};
 }
}
