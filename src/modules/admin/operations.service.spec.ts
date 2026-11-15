import { OperationsService } from './operations.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnnouncementDto, ScheduleRideDto } from './operations.dto';
describe('Admin operations',()=>{
 const rpc=jest.fn();const service=new OperationsService({getAdminClient:()=>({rpc})} as any);
 beforeEach(()=>rpc.mockReset().mockResolvedValue({data:{id:'created'},error:null}));
 it('sends a create operation and actor to one audited transaction',async()=>{await service.operate('club',{name:'Test group'},'admin');expect(rpc).toHaveBeenCalledWith('admin_operate',{operation:'club',entry:{name:'Test group'},actor_id:'admin'})});
 it('rejects a ride in the past',async()=>{await expect(service.operate('ride',{start_time:'2000-01-01T00:00:00Z'},'admin')).rejects.toThrow('future');expect(rpc).not.toHaveBeenCalled()});
 it('requires a target for group-only content',async()=>{await expect(service.operate('announcement',{audience:'club'},'admin')).rejects.toThrow('Select a group')});
 it('rejects expiry before publication',async()=>{await expect(service.operate('announcement',{audience:'all_riders',publish_at:'2030-01-02T00:00:00Z',expires_at:'2030-01-01T00:00:00Z'},'admin')).rejects.toThrow('Expiry')});
 it('rejects an unrelated group on a global announcement',async()=>await expect(service.operate('announcement',{audience:'all_riders',club_id:'group'},'admin')).rejects.toThrow('group-specific'));
 it('does not report a failed transaction as a successful save',async()=>{rpc.mockResolvedValue({error:{code:'P0001',message:'Captain must belong to the selected group'}});await expect(service.operate('club',{},'admin')).rejects.toThrow('Captain must belong')});
 it('validates announcement length, target and dates',async()=>{const errors=await validate(plainToInstance(AnnouncementDto,{title:'',body:'',audience:'everyone',publish_at:'bad'}));expect(errors.length).toBeGreaterThan(0)});
 it('rejects invalid ride limits and captain identities',async()=>{const errors=await validate(plainToInstance(ScheduleRideDto,{max_riders:500,captain_id:'fake'}));expect(errors.map(error=>error.property)).toEqual(expect.arrayContaining(['max_riders','captain_id']))});
 it('exports real aggregate totals without a synthetic payment amount',async()=>{rpc.mockResolvedValue({data:{totals:{riders:7,rides:2}},error:null});const data=await service.report('summary');expect(data.rows).toEqual([{metric:'riders',count:7},{metric:'rides',count:2}])});
});
