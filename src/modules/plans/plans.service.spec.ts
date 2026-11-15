import { PlansService } from './plans.service';
describe('Plan publishing',()=>{
 it('forces launch prices to zero and attributes audit actor',async()=>{
  const rpc=jest.fn().mockResolvedValue({data:{id:'plan_free'},error:null});
  const service=new PlansService({getAdminClient:()=>({rpc})} as any);
  await service.write({id:'plan_free',price_inr:999,price_usd:20},'admin-id',true);
  expect(rpc).toHaveBeenCalledWith('admin_save_plan',{plan_data:{id:'plan_free',price_inr:0,price_usd:0},actor_id:'admin-id',is_new:true});
 });
 it('does not report success when the transaction fails',async()=>{
  const service=new PlansService({getAdminClient:()=>({rpc:async()=>({error:{message:'audit failure'}})})} as any);
  await expect(service.write({id:'p'},'actor',false)).rejects.toThrow('Plan could not be saved');
 });
});
