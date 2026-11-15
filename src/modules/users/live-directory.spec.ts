import { UsersService } from './users.service';
import { ClubsService } from '../clubs/clubs.service';
import { RidesService } from '../rides/rides.service';
describe.each([UsersService,ClubsService,RidesService])('Live directory %p',Service=>{
 function db(error:any,data:any){const query:any={select:()=>query,eq:()=>query,order:()=>query,limit:async()=>({error,data})};return {getClient:()=>({from:()=>query}),getAdminClient:()=>({from:()=>query})} as any}
 it('preserves a genuinely empty database',async()=>expect(await new Service(db(null,[])).findAll()).toEqual([]));
 it('does not substitute sample records for failed database reads',async()=>expect(new Service(db({code:'42501'},null)).findAll()).rejects.toEqual({code:'42501'}));
});
