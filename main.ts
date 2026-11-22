// Tiny stack VM: exact interpreter of the bounty ISA (ISA.md). The dispatch
// table T packs each opcode's (pops, pushes) as one printable char:
// charCode - 33 = pops*4 + pushes, a space marks an unknown opcode.
import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output',T=`!""%'+,0        *******&***&*** ***             !%%!!           &)              %%"%`;
function run(p,q){
 const D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536),n=p.length;
 let s=0,c=0,x=0,t=0,g=0,l=0;const f=e=>[o.subarray(0,l),e];
 for(;;){
  if(t===1e6)return f(10);
  if(x<0||x>=n)return f(9);
  const b=p[x],v=T.charCodeAt(b)-33;
  if(!(v>=0))return f(5);
  const a=v>>2,d=v&3,m=b===1?1:b===2?4:b>47&&b<52?2:0;
  if(x+m>=n)return f(9);
  t++;
  if(s<a)return f(2);
  if(s-a+d>256)return f(3);
  x+=1+m;
  switch(b){
   case 0:return f(0);
   case 1:D[s++]=(p[x-1]<<24)>>24;break;
   case 2:D[s++]=p[x-4]|p[x-3]<<8|p[x-2]<<16|p[x-1]<<24;break;
   case 3:s--;break;
   case 4:D[s]=D[s-1];s++;break;
   case 5:{const k=D[s-1];D[s-1]=D[s-2];D[s-2]=k;break;}
   case 6:D[s]=D[s-2];s++;break;
   case 7:{const k=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=k;break;}
   case 23:D[s-1]=-D[s-1]|0;break;
   case 27:D[s-1]=~D[s-1];break;
   case 48:x+=(p[x-2]|p[x-1]<<8)<<16>>16;break;
   case 49:case 50:{const r=(p[x-2]|p[x-1]<<8)<<16>>16,k=D[--s];if((b===49)===(k===0))x+=r;break;}
   case 51:if(c===64)return f(7);C[c++]=x;x=p[x-2]|p[x-1]<<8;break;
   case 52:if(!c)return f(8);x=C[--c];break;
   case 64:{const k=D[s-1];if(k<0||k>255)return f(6);D[s-1]=M[k];break;}
   case 65:{const k=D[s-1];if(k<0||k>255)return f(6);M[k]=D[s-2];s-=2;break;}
   case 80:{const w=String(D[--s]);if(l+w.length>65536)return f(11);for(let i=0;i<w.length;i++)o[l++]=w.charCodeAt(i);break;}
   case 81:if(l>=65536)return f(11);o[l++]=D[--s]&255;break;
   case 82:D[s++]=g<q.length?q[g++]:-1;break;
   case 83:return f(D[--s]&255);
   default:{
    const y=D[s-1],z=D[s-2];let r;
    if(b===16)r=z+y|0;
    else if(b===17)r=z-y|0;
    else if(b===18)r=Math.imul(z,y);
    else if(b===19){if(!y)return f(4);r=z===-2147483648&&y===-1?z:(z/y)|0;}
    else if(b===20){if(!y)return f(4);r=y===-1?0:z%y|0;}
    else if(b===21){if(!y)return f(4);r=Math.floor((z>>>0)/(y>>>0))|0;}
    else if(b===22){if(!y)return f(4);r=(z>>>0)%(y>>>0)|0;}
    else if(b===24)r=z&y;
    else if(b===25)r=z|y;
    else if(b===26)r=z^y;
    else if(b===28)r=z<<(y&31);
    else if(b===29)r=z>>(y&31);
    else if(b===30)r=(z>>>(y&31))|0;
    else if(b===32)r=z===y?1:0;
    else if(b===33)r=z<y?1:0;
    else r=z>>>0<y>>>0?1:0;
    s-=2;D[s++]=r;
   }
  }
 }
}
for(const id of readdirSync(I).sort()){
 const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
 mkdirSync(join(O,id),{recursive:true});
 writeFileSync(join(O,id,'stdout.bin'),r[0]);
 writeFileSync(join(O,id,'exit.txt'),r[1]+'\n');
}
