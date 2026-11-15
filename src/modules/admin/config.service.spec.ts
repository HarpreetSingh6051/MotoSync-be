import { ConfigAdminService } from './config.service';
describe('Configuration management',()=>{
 const rpc=jest.fn();const service=new ConfigAdminService({getAdminClient:()=>({rpc})} as any);
 beforeEach(()=>rpc.mockReset().mockResolvedValue({data:{key:'rides'},error:null}));
 it('writes availability consistently and attributes the audit actor',async()=>{await service.write('flags','rides',{name:'Rides',service_status:'maintenance'},'admin');expect(rpc).toHaveBeenCalledWith('admin_save_config',expect.objectContaining({actor_id:'admin',changes:expect.objectContaining({is_enabled:false,service_status:'maintenance'})}))});
 it.each([['unknown','x',{name:'test'}],['constructor','x',{}],['flags','rides',{role:'super_admin'}],['flags','rides',{service_status:'bad'}],['flags','rides',{rollout_percentage:101}],['sounds','x',{audio_url:'javascript:alert(1)'}]])('rejects invalid configuration %s',async(resource,id,values)=>{await expect(service.write(resource as string,id as string,values as any,'admin')).rejects.toThrow();expect(rpc).not.toHaveBeenCalled()});
 it('propagates transaction failure instead of reporting success',async()=>{rpc.mockResolvedValue({error:{code:'PGRST202'}});await expect(service.write('sounds','sound',{name:'Sound'},'admin')).rejects.toEqual({code:'PGRST202'})});
});
