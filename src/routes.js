export const spacing = 120;
const definitions = [
 ['City introduction','Foundations',[[2,4],[2,3],[2,2],[3,2],[3,1],[2,1],[2,0]]],
 ['The boulevard','Urban driving',[[1,4],[1,3],[1,2],[1,1],[2,1],[3,1],[3,0]]],
 ['Market quarter','Pedestrians',[[3,4],[3,3],[2,3],[2,2],[1,2],[1,1],[0,1]]],
 ['Residential loop','Lane discipline',[[0,4],[0,3],[1,3],[1,2],[2,2],[2,1],[3,1],[3,0]]],
 ['Central crossing','Junctions',[[4,4],[4,3],[3,3],[3,2],[2,2],[2,1],[1,1],[1,0]]],
 ['East district','Precision turns',[[2,4],[2,3],[3,3],[3,2],[4,2],[4,1],[3,1],[3,0]]],
 ['Long way home','Endurance',[[0,4],[0,3],[0,2],[1,2],[1,3],[2,3],[3,3],[3,2],[3,1],[2,1],[2,0]]],
 ['The final drive','Full assessment',[[4,4],[4,3],[3,3],[3,2],[4,2],[4,1],[3,1],[2,1],[2,2],[1,2],[1,1],[1,0]]]
];
export function lanePath(nodes){return nodes.map((n,i)=>{const prev=nodes[Math.max(0,i-1)],next=nodes[Math.min(nodes.length-1,i+1)];const a=i?{x:n[0]-prev[0],z:n[1]-prev[1]}:{x:next[0]-n[0],z:next[1]-n[1]};const b=i<nodes.length-1?{x:next[0]-n[0],z:next[1]-n[1]}:a;const same=a.x===b.x&&a.z===b.z;return{x:n[0]*spacing-(a.z+(same?0:b.z))*3.3,z:n[1]*spacing+(a.x+(same?0:b.x))*3.3};});}
export const routes=definitions.map(([name,difficulty,nodes],i)=>{const points=lanePath(nodes);return{id:i,name,difficulty,nodes,points,length:points.slice(1).reduce((d,p,j)=>d+Math.hypot(p.x-points[j].x,p.z-points[j].z),0),turns:nodes.slice(1,-1).filter((n,j)=>{const a=nodes[j],b=nodes[j+2];return (n[0]-a[0])*(b[1]-n[1])!==(n[1]-a[1])*(b[0]-n[0]);}).length};});
export function turnAt(points,index){if(index>=points.length-1)return 'finish';const a=points[index-1],b=points[index],c=points[index+1];const cross=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);return Math.abs(cross)<50?'straight':cross>0?'right':'left';}
export function lightGreen(time,axis){return axis==='z'?time%32<13:time%32>=16&&time%32<29;}
export function applyViolation(state,severe=false){const mistakes=state.mistakes+1;return {mistakes,score:severe?0:Math.max(0,100-mistakes*35),failed:severe||mistakes>=3};}
