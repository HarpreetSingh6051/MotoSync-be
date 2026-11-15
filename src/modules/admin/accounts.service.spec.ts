import { AdminAccountsService } from './accounts.service';
describe('Admin account provisioning',()=>{
 it('marks Auth identity as admin-only and never stores passwords in the admin record',async()=>{
  const rpc=jest.fn().mockResolvedValue({data:{id:'new-admin'},error:null});
  const createUser=jest.fn().mockResolvedValue({data:{user:{id:'new-admin'}},error:null});
  const client={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'viewer'}})})})}),auth:{admin:{createUser}},rpc};
  await new AdminAccountsService({getAdminClient:()=>client} as any).create({full_name:'Test admin',role_id:'viewer',status:'active',email:'staff@example.com',password:'long-password-test'},'actor');
  expect(createUser.mock.calls[0][0].app_metadata).toEqual({account_type:'admin'});
  expect(rpc.mock.calls[0][1].changes).toEqual({full_name:'Test admin',role_id:'viewer',status:'active'});
 });
 it('cleans up a newly created login when admin-record creation fails',async()=>{
  const deleteUser=jest.fn().mockResolvedValue({error:null});
  const client={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'viewer'}})})})}),auth:{admin:{createUser:async()=>({data:{user:{id:'new-admin'}}}),deleteUser}},rpc:async()=>({error:{code:'failure'}})};
  await expect(new AdminAccountsService({getAdminClient:()=>client} as any).create({full_name:'Admin',role_id:'viewer',status:'active',email:'staff@example.com',password:'long-password-test'},'actor')).rejects.toEqual({code:'failure'});
  expect(deleteUser).toHaveBeenCalledWith('new-admin');
 });
});
