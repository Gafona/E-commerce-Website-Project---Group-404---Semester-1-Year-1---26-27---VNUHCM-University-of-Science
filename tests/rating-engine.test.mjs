import test from 'node:test'
import assert from 'node:assert/strict'
import * as E from '../src/lib/rating/ratingEngine.ts'
const { computeMatchDeltas, countUniqueOpponents, expectedScore, calculateBlendedRating: B, applyTournamentCap, findFarmViolators, measureAndApplyDrift } = E
{
const ok=(n,c)=>test(n,()=>assert.ok(c));
const P=(id,mr,n,g=0,dev)=>({id,mr,matchesPlayed:n,mrGainFirst10:g,deviceId:dev});
const near=(a,b)=>Math.abs(a-b)<1e-6;
// 1 đơn 1000 vs 1000, ổn định, cộng đồng, thắng: +12
let d=computeMatchDeltas([P('a',1000,20)],[P('b',1000,20)],true,'community');
ok('đơn ngang nhau thắng +12',near(d.a,12)&&near(d.b,-12));
// 2 tổng bằng 0
d=computeMatchDeltas([P('a',1200,3)],[P('b',900,40)],false,'community');
ok('tổng bằng 0',near(d.a+d.b,0)); ok('K_match=max → 48',near(d.a,-48*expectedScore(1200,900)));
// 3 người mới sát trần +400: chỉ còn 20
d=computeMatchDeltas([P('a',1000,3,380)],[P('b',1000,30)],true,'community');
ok('cap người mới còn 20',near(d.a,20));
// 4 cap áp cho người thứ hai (B mới, A cũ thua)
d=computeMatchDeltas([P('a',1000,30)],[P('b',1000,3,390)],false,'community');
ok('cap áp cho B',near(d.b,10)&&d.a<0);
// 5 farm: chỉ người vi phạm ΔR=0 (đôi), người kia giữ nguyên
d=computeMatchDeltas([P('a1',1000,20),P('a2',1000,20)],[P('b1',1000,20),P('b2',1000,20)],true,'community',new Set(['a2','b1']));
ok('farm: a2,b1=0',d.a2===0&&d.b1===0); ok('farm: a1,b2 giữ',near(d.a1,12)&&near(d.b2,-12));
// 6 không NaN khi có K nhỏ
d=computeMatchDeltas([P('a',1000,20)],[P('b',1000,20)],true,'friendly');
ok('không NaN',Number.isFinite(d.a)&&near(d.a,5));
// 7 thắng người mạnh hơn không bao giờ giảm
let bad=0; for(const ra of [800,1000,1500]) for(const rb of [ra+1,ra+200,ra+800]) { const x=computeMatchDeltas([P('a',ra,20)],[P('b',rb,20)],true,'official'); if(x.a<0) bad++; }
ok('thắng người mạnh hơn không giảm',bad===0);
// 8 đôi: tổng 4 người bằng 0
d=computeMatchDeltas([P('a1',1100,20),P('a2',900,20)],[P('b1',1000,20),P('b2',1000,20)],true,'community');
ok('đôi tổng 0',near(d.a1+d.a2+d.b1+d.b2,0));
// countUniqueOpponents
const players={target:{deviceId:'X'},o1:{deviceId:'A'},o2:{deviceId:'A'},o3:{deviceId:'A'},o4:{deviceId:'B'},twin:{deviceId:'X'}};
const m=(id,o,extra={})=>({matchId:id,matchType:'community',date:new Date(),teamA:['target'],teamB:o,isVerified:true,isAdminVerified:true,isWalkover:false,isKZero:false,...extra});
ok('2 alt cùng máy = 1',countUniqueOpponents([m('1',['o1']),m('2',['o2'])],'target','community',players)===1);
ok('3 alt cùng máy = 1',countUniqueOpponents([m('1',['o1']),m('2',['o2']),m('3',['o3'])],'target','community',players)===1);
ok('đôi: hai đối thủ cùng máy = 1',countUniqueOpponents([m('1',['o1','o2'])],'target','community',players)===1);
ok('đối thủ cùng máy với chính mình không tính',countUniqueOpponents([m('1',['twin']),m('2',['o4'])],'target','community',players)===1);
ok('V2 thiếu admin xác minh bị loại',countUniqueOpponents([m('1',['o1'],{isAdminVerified:false})],'target','community',players)===0);
ok('walkover/KZero bị loại',countUniqueOpponents([m('1',['o1'],{isWalkover:true}),m('2',['o4'],{isKZero:true})],'target','community',players)===0);
ok('đếm theo phía B',countUniqueOpponents([{...m('1',['target']),teamA:['o4'],teamB:['target']}],'target','community',players)===1);

}
{
const ok=(n,c)=>test(n,()=>assert.ok(c));
let r=B({ar:1500,mr:1000,v1:0,v2:0,v3:0,uniqueV2Opponents:0});
ok('chỉ AR 1500: br=1500 bị chặn ≤1199',r.br===1199&&r.activeCaps.length===2);
r=B({ar:1500,mr:1500,v1:0,v2:0,v3:5,uniqueV2Opponents:0});
ok('5 trận V3 gỡ cả hai trần',r.isFullyUncapped&&Math.abs(r.br-(5/15*1500+10/15*1500))<1e-9);
r=B({ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:3});
ok('10 V2 ≥3 đối thủ: gỡ trần 1, còn trần AR+200',r.activeCaps.join()==='cap2_AR+200');
r=B({ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:2});
ok('10 V2 chỉ 2 đối thủ: chưa gỡ',r.activeCaps.length===2);
r=B({ar:1500,mr:1500,v1:0,v2:20,v3:0,uniqueV2Opponents:5});
ok('20 V2 ≥5 đối thủ: gỡ hết',r.isFullyUncapped);
r=B({ar:900,mr:900,v1:0,v2:0,v3:0,uniqueV2Opponents:0});
ok('AR 900: trần AR+200=1100 chặt hơn 1199',r.br===900&&r.activeCaps.length===2);
const c=applyTournamentCap({a:120,b:-95,c:30});
ok('trần ±80',c.a===80&&c.b===-80&&c.c===30);
const d0=new Date('2026-11-10');
const m=(id,days,a,b,x={})=>({matchId:id,matchType:'community',date:new Date(d0.getTime()-days*86400000),teamA:[a],teamB:[b],isVerified:true,isWalkover:false,isKZero:false,...x});
const cur={...m('cur',0,'a','b'),date:d0};
ok('2 trận trước trong 30 ngày → vi phạm cả hai',findFarmViolators([m('1',3,'a','b'),m('2',5,'b','a')],cur).size===2);
ok('1 trận trước: không vi phạm',findFarmViolators([m('1',3,'a','b')],cur).size===0);
ok('trận ngoài 30 ngày không đếm',findFarmViolators([m('1',31,'a','b'),m('2',40,'a','b')],cur).size===0);
ok('trận KZero/walkover/chưa xác minh không đếm',findFarmViolators([m('1',3,'a','b',{isKZero:true}),m('2',4,'a','b',{isWalkover:true}),m('3',5,'a','b',{isVerified:false})],cur).size===0);
ok('trận official không đếm',findFarmViolators([m('1',3,'a','b',{matchType:'official'}),m('2',4,'a','b',{matchType:'official'})],cur).size===0);
ok('vòng bảng có admin xác minh: miễn',findFarmViolators([m('1',3,'a','b'),m('2',4,'a','b')],{...cur,tournamentId:'T',tournamentPhase:'group',isAdminVerified:true}).size===0);
ok('đôi: chỉ cặp đối đầu bị đếm',(()=>{const dm=(id,days)=>({...m(id,days,'a1','b1'),teamA:['a1','a2'],teamB:['b1','b2']});const v=findFarmViolators([dm('1',3),dm('2',4)],{...cur,teamA:['a1','a3'],teamB:['b1','b3']});return v.has('a1')&&v.has('b1')&&!v.has('a3')&&!v.has('b3')})());
let x=measureAndApplyDrift({a:1100,b:1100});
ok('drift +: kéo về 1000',x.driftApplied===-100&&x.newRatings.a===1000);
x=measureAndApplyDrift({a:900,b:900});
ok('drift −: kéo về 1000',x.driftApplied===100);
x=measureAndApplyDrift({a:1030,b:1030});
ok('trong ngưỡng 50: không đổi',x.driftApplied===0);

}
