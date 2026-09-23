/* =========================================================
   Shaders
   ========================================================= */
const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float f=0.0,a=0.5;for(int i=0;i<6;i++){f+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return f;}
float fbm4(vec3 p){float f=0.0,a=0.5;for(int i=0;i<4;i++){f+=a*snoise(p);p=p*2.07+vec3(3.1,1.3,7.7);a*=0.5;}return f;}
`;

const GLSL_WORLEY = /* glsl */`
vec3 hash33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
vec2 worley(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); float d=8.0; float id=0.0;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
    vec3 g=vec3(float(x),float(y),float(z));
    vec3 o=hash33(i+g);
    vec3 r=g+o-f; float dd=dot(r,r);
    if(dd<d){d=dd;id=o.x;}
  }
  return vec2(sqrt(d),id);
}
float crater(vec3 p){
  vec2 w=worley(p);
  float on=step(0.42,w.y);
  float rad=0.16+0.3*w.y;
  float bowl=1.0-smoothstep(0.0,rad,w.x);
  float rim=smoothstep(rad*0.7,rad,w.x)*(1.0-smoothstep(rad,rad*1.45,w.x));
  return on*(rim*0.9-bowl*0.55);
}
`;

/* ---------- Equirectangular bake (surface textures, nebula) ---------- */
const BAKE_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }
`;
const BAKE_FRAG = /* glsl */`
precision highp float;
uniform float uType; uniform float uSeed; uniform float uMode;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD;
varying vec2 vUv;
${GLSL_NOISE}
${GLSL_WORLEY}
vec3 dirFromUv(vec2 uv){ float phi=uv.x*6.28318530718; float th=(1.0-uv.y)*3.14159265359; return vec3(-cos(phi)*sin(th),cos(th),sin(phi)*sin(th)); }
vec3 llDir(float lon,float lat){ float cl=cos(lat); return vec3(-cos(lon)*cl,sin(lat),sin(lon)*cl); }
void main(){
  vec3 d=dirFromUv(vUv);
  float lat=d.y;
  float lon=atan(d.z,-d.x);
  vec3 s=vec3(uSeed,uSeed*1.37,uSeed*0.71);
  vec4 o=vec4(0.0,0.0,0.0,1.0);

  if(uType<0.5){ // ---- Mercury: cratered rock
    float n=fbm(d*2.2+s); float n2=fbm(d*7.0+s*1.7);
    vec3 col=mix(uA,uB,smoothstep(-0.55,0.6,n*0.7+n2*0.45));
    float cr=crater(d*5.0+s)+0.7*crater(d*11.0+s*2.0)+0.45*crater(d*24.0+s*3.0);
    col*=0.86+cr*0.34;
    col=mix(col,uC,smoothstep(0.5,0.85,fbm(d*3.5+s+4.0))*0.35);
    col=mix(col,uD,smoothstep(0.35,0.7,fbm(d*1.4+s+9.0))*0.3);
    o=vec4(col,1.0);
  } else if(uType<1.5){ // ---- Venus: swirling cloud deck
    vec3 q=d*1.6;
    vec3 w=vec3(fbm(q+s),fbm(q+vec3(5.2,1.3,2.0)+s),fbm(q+vec3(2.8,7.1,4.4)+s));
    float n=fbm(vec3(d.x*1.2,d.y*5.0,d.z*1.2)+w*1.7);
    float band=sin(lat*9.0+n*3.0)*0.5+0.5;
    vec3 col=mix(uA,uB,smoothstep(-0.6,0.7,n));
    col=mix(col,uC,band*0.32);
    col=mix(col,uD,smoothstep(0.3,0.9,fbm(d*5.0+w))*0.25);
    // the dark Y-shaped equatorial feature, softly
    col*=1.0-0.12*exp(-pow(lat*4.0,2.0))*smoothstep(0.0,0.6,fbm(d*2.5+w+3.0));
    o=vec4(col,1.0);
  } else if(uType<2.5){ // ---- Earth
    float h=fbm(d*1.7+s)+0.35*fbm(d*5.0+s*1.3)+0.12*fbm(d*14.0+s);
    float sea=0.06;
    float land=smoothstep(sea,sea+0.012,h);
    float alat=abs(lat);
    float ice=smoothstep(0.8,0.86,alat+fbm(d*6.0+s)*0.07);
    if(uMode<0.5){
      float coast=smoothstep(sea-0.14,sea,h);
      vec3 ocean=mix(vec3(0.012,0.05,0.16),vec3(0.03,0.2,0.38),coast*coast);
      float moist=fbm(d*2.6+vec3(7.0)+s);
      float dry=exp(-pow((alat-0.4)/0.15,2.0));
      float wet=moist-dry*0.55+0.1;
      vec3 lc=mix(vec3(0.66,0.53,0.33),vec3(0.16,0.32,0.11),smoothstep(-0.25,0.05,wet));
      lc=mix(lc,vec3(0.06,0.19,0.07),smoothstep(0.12,0.42,wet)*(1.0-smoothstep(0.55,0.75,alat)));
      lc=mix(lc,vec3(0.4,0.39,0.33),smoothstep(0.6,0.76,alat));
      lc=mix(lc,vec3(0.48,0.42,0.35),smoothstep(0.3,0.6,h-sea));
      lc*=0.9+0.2*fbm(d*20.0+s);
      vec3 col=mix(ocean,lc,land);
      col=mix(col,vec3(0.9,0.94,0.98),ice);
      o=vec4(col,(1.0-land)*(1.0-ice));
    } else if(uMode<1.5){ // clouds
      vec3 w=vec3(fbm(d*2.0+3.1+s),fbm(d*2.0+7.7+s),fbm(d*2.0+1.3+s));
      float c=fbm(d*2.8+w*1.3+s)+0.3*fbm(d*9.0+w);
      c+=0.14*sin(lat*16.0+w.x*2.0);
      c-=0.18*exp(-pow((abs(lat)-0.42)/0.12,2.0));
      float a=smoothstep(0.08,0.6,c);
      o=vec4(vec3(1.0),a*0.92);
    } else { // night lights
      float dry=exp(-pow((alat-0.4)/0.15,2.0))*smoothstep(0.1,-0.3,fbm(d*2.6+vec3(7.0)+s));
      float pop=smoothstep(-0.25,0.45,fbm(d*3.5+s+11.0));
      float city=smoothstep(0.42,0.8,fbm(d*42.0+s))*land*(1.0-ice)*(1.0-dry)*pop;
      float coastal=land*(1.0-smoothstep(sea,sea+0.07,h))*smoothstep(0.2,0.7,fbm(d*60.0+s))*0.9;
      float v=clamp(max(city,coastal*pop)*1.3,0.0,1.0)*(1.0-smoothstep(0.62,0.75,alat));
      o=vec4(vec3(1.0,0.7,0.36)*v,1.0);
    }
  } else if(uType<3.5){ // ---- Mars
    float n=fbm(d*1.8+s); float n2=fbm(d*6.0+s);
    vec3 col=mix(uA,uB,smoothstep(-0.35,0.45,n+0.3*n2+0.15));
    col=mix(col,uC,smoothstep(0.3,0.8,fbm(d*3.0+s+5.0))*0.5);
    col*=0.9+0.22*(crater(d*7.0+s)+0.5*crater(d*16.0+s*2.0));
    float vm=exp(-pow((lat+0.12+0.035*sin(lon*7.0))*38.0,2.0))*(1.0-smoothstep(0.35,0.6,abs(lon-1.1)));
    col*=1.0-vm*0.6;
    vec3 oc=llDir(-2.1,0.32); float od=distance(d,oc);
    col=mix(col,col*1.28,smoothstep(0.12,0.04,od));
    col*=1.0-0.4*exp(-pow((od-0.12)*45.0,2.0));
    for(int k=0;k<3;k++){ vec3 tc=llDir(-1.75+float(k)*0.18,0.02+float(k)*0.12); col*=1.0-0.25*exp(-pow(distance(d,tc)*30.0,2.0)); }
    float cap=smoothstep(0.9,0.935,abs(lat)+0.04*fbm(d*8.0+s));
    col=mix(col,vec3(0.95,0.93,0.9),cap);
    o=vec4(col,1.0);
  } else if(uType<4.5){ // ---- Jupiter
    float t=fbm(d*vec3(2.0,9.0,2.0)+s)*0.06+fbm(d*vec3(5.0,18.0,5.0)+s*2.0)*0.025;
    float b=lat+t;
    vec3 col=mix(uA,uB,smoothstep(-0.4,0.4,sin(b*22.0)));
    col=mix(col,uC,smoothstep(0.3,0.9,sin(b*9.0+1.0))*0.55);
    col=mix(col,uD,smoothstep(0.6,1.0,sin(b*41.0+2.0))*0.28);
    col*=0.92+0.16*fbm(d*12.0+s);
    col=mix(col,uC*0.72,smoothstep(0.62,0.95,abs(lat))*0.65);
    vec2 e=vec2((lon-0.9)/0.3,(lat+0.36)/0.11);
    float r=length(e);
    float ca=cos(r*3.0),sa=sin(r*3.0);
    vec2 re=vec2(e.x*ca-e.y*sa,e.x*sa+e.y*ca);
    float sw=fbm(vec3(re*1.6,uSeed));
    vec3 grs=mix(vec3(0.72,0.33,0.2),vec3(0.88,0.58,0.4),smoothstep(0.1,0.95,r)+sw*0.35);
    col=mix(col,grs,smoothstep(1.05,0.72,r));
    col=mix(col,vec3(0.96,0.92,0.84),smoothstep(0.14,0.0,abs(r-1.12))*0.45);
    for(int k=0;k<5;k++){ float kl=-0.55+float(k)*0.05; vec2 oe=vec2((lon-(-2.4+float(k)*1.1))/0.06,(lat-kl)/0.03); col=mix(col,vec3(0.97,0.95,0.9),smoothstep(1.0,0.3,length(oe))*0.8); }
    o=vec4(col,1.0);
  } else if(uType<5.5){ // ---- Saturn
    float t=fbm(d*vec3(2.0,10.0,2.0)+s)*0.035+fbm(d*vec3(4.0,22.0,4.0)+s)*0.012;
    float b=lat+t;
    vec3 col=mix(uA,uB,(smoothstep(-0.8,0.8,sin(b*26.0))*0.35+smoothstep(-1.0,1.0,sin(b*11.0+0.4))*0.3));
    col=mix(col,uC,smoothstep(0.55,1.0,sin(b*6.0+0.6))*0.22);
    col=mix(col,uC*0.9,smoothstep(0.55,0.9,abs(lat))*0.35);
    col*=0.96+0.08*fbm(d*10.0+s);
    float ang=atan(d.z,d.x);
    float seg=mod(ang,1.0471976)-0.5235988;
    float hexR=0.24*0.8660254/cos(seg);
    float rad=length(d.xz);
    float inHex=step(0.0,lat)*smoothstep(hexR+0.012,hexR-0.012,rad);
    col=mix(col,uD,inHex*0.22);
    col=mix(col,col*0.85,step(0.0,lat)*exp(-pow((rad-hexR)*120.0,2.0))*0.4);
    col=mix(col,uD*0.7,step(0.0,lat)*smoothstep(0.06,0.0,rad)*0.6);
    o=vec4(col,1.0);
  } else if(uType<6.5){ // ---- Uranus
    float t=fbm(d*vec3(2.0,8.0,2.0)+s)*0.04;
    vec3 col=mix(uA,uB,smoothstep(-1.0,1.0,sin((lat+t)*10.0))*0.6+0.2);
    col=mix(col,uC,smoothstep(0.35,0.95,lat)*0.55);
    col=mix(col,uD,smoothstep(-0.2,-0.9,lat)*0.25);
    col*=0.97+0.06*fbm(d*6.0+s);
    o=vec4(col,1.0);
  } else if(uType<7.5){ // ---- Neptune
    float t=fbm(d*vec3(2.0,8.0,2.0)+s)*0.08;
    vec3 col=mix(uA,uB,smoothstep(-0.7,0.7,sin((lat+t)*12.0)));
    col=mix(col,uA*0.7,smoothstep(0.6,0.95,abs(lat))*0.5);
    vec2 e=vec2((lon+1.6)/0.3,(lat+0.33)/0.13); float r=length(e);
    col=mix(col,uC,smoothstep(1.0,0.55,r)*0.85);
    col=mix(col,uD,smoothstep(1.0,0.3,length(e-vec2(0.3,1.25)))*0.75);
    float st=fbm(vec3(d.x*1.5,d.y*30.0,d.z*1.5)+s);
    col=mix(col,uD,smoothstep(0.35,0.72,st)*0.5*smoothstep(0.08,0.3,abs(lat)));
    o=vec4(col,1.0);
  } else { // ---- Nebula / Milky Way backdrop
    vec3 bn=normalize(vec3(0.25,1.0,-0.35));
    float band=exp(-pow(dot(d,bn)/0.28,2.0));
    float core=exp(-pow(distance(d,normalize(vec3(-0.8,-0.05,0.55)))/0.7,2.0));
    float n=fbm(d*3.0+s); float m=fbm(d*6.5+n*1.5+s);
    vec3 c1=vec3(0.07,0.05,0.16), c2=vec3(0.02,0.1,0.16), c3=vec3(0.2,0.1,0.14);
    vec3 col=mix(c1,c2,smoothstep(-0.4,0.5,n));
    col=mix(col,c3,smoothstep(0.2,0.8,m)*0.5);
    float dust=smoothstep(-0.25,0.35,fbm(d*9.0+s*2.0));
    float glow=band*(0.35+0.65*smoothstep(-0.3,0.7,m))*(0.6+core*1.1);
    col=col*glow*dust*1.4+vec3(0.012,0.012,0.02)*(0.5+0.5*n);
    col+=vec3(0.25,0.18,0.12)*core*band*0.18*dust;
    o=vec4(col,1.0);
  }
  gl_FragColor=o;
}
`;

/* ---------- Planet surface ---------- */
const PLANET_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
void main(){
  vUv=uv;
  vec4 wp=modelMatrix*vec4(position,1.0);
  vPw=wp.xyz;
  vNw=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*wp;
}
`;
const PLANET_FRAG = /* glsl */`
uniform sampler2D uMap; uniform sampler2D uNight;
uniform float uBaked; uniform float uHasNight; uniform float uSpec; uniform float uWrap;
uniform vec3 uFallback; uniform vec3 uSun; uniform vec3 uAtmo; uniform float uAtmoAmt;
uniform float uScan; uniform vec3 uScanCol; uniform float uTime; uniform float uLightBoost;
varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
void main(){
  vec3 N=normalize(vNw);
  vec3 L=normalize(uSun-vPw);
  vec3 V=normalize(cameraPosition-vPw);
  vec4 tex=texture2D(uMap,vUv);
  vec3 alb=mix(uFallback,tex.rgb,uBaked);
  float ndl=dot(N,L);
  float lit=clamp((ndl+uWrap)/(1.0+uWrap),0.0,1.0);
  lit=lit*smoothstep(-0.12,0.18,ndl+uWrap*0.5);
  vec3 col=alb*(lit*1.08*uLightBoost+0.03);
  float ocean=tex.a*uSpec*uBaked;
  vec3 H=normalize(L+V);
  float sp=pow(max(dot(N,H),0.0),70.0)*ocean*step(0.0,ndl);
  col+=vec3(1.0,0.9,0.75)*sp*0.5;
  col+=vec3(0.6,0.75,1.0)*pow(max(dot(N,H),0.0),8.0)*ocean*0.06*lit;
  vec3 night=texture2D(uNight,vUv).rgb*uHasNight*uBaked;
  col+=night*smoothstep(0.05,-0.25,ndl)*1.25;
  float fr=pow(1.0-max(dot(N,V),0.0),2.6);
  col+=uAtmo*fr*uAtmoAmt*smoothstep(-0.25,0.55,ndl)*0.9;
  if(uScan>0.001){
    float gx=vUv.x*36.0; float gy=vUv.y*18.0;
    float wx=fwidth(gx)*1.2; float wy=fwidth(gy)*1.2;
    float fx=fract(gx); float fy=fract(gy);
    float line=max(1.0-smoothstep(0.0,wx,min(fx,1.0-fx)),1.0-smoothstep(0.0,wy,min(fy,1.0-fy)));
    float band=exp(-pow((vUv.y-fract(uTime*0.07))*28.0,2.0));
    float edge=pow(1.0-max(dot(N,V),0.0),1.5);
    col=mix(col,col*0.55,uScan*0.35);
    col+=uScanCol*(line*0.45*(0.4+edge)+band*0.55)*uScan;
  }
  gl_FragColor=vec4(col,1.0);
}
`;

/* ---------- Cloud layer ---------- */
const CLOUD_FRAG = /* glsl */`
uniform sampler2D uMap; uniform float uBaked; uniform vec3 uSun; uniform float uOpacity; uniform float uLightBoost;
varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
void main(){
  vec3 N=normalize(vNw); vec3 L=normalize(uSun-vPw);
  float ndl=dot(N,L);
  float lit=smoothstep(-0.15,0.35,ndl)*(0.25+0.75*max(ndl,0.0));
  float a=texture2D(uMap,vUv).a*uBaked*uOpacity;
  vec3 col=mix(vec3(1.0,0.72,0.55),vec3(1.0),smoothstep(0.0,0.3,ndl))*lit*uLightBoost;
  gl_FragColor=vec4(col,a*(0.25+0.75*smoothstep(-0.3,0.2,ndl)));
}
`;

/* ---------- Atmosphere halo (back-face shell) ---------- */
const ATMO_VERT = /* glsl */`
varying vec3 vNw; varying vec3 vPw;
void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vPw=wp.xyz; vNw=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }
`;
const ATMO_FRAG = /* glsl */`
uniform vec3 uSun; uniform vec3 uCol; uniform vec3 uSunset; uniform float uAmt; uniform float uEdge;
varying vec3 vNw; varying vec3 vPw;
void main(){
  vec3 N=normalize(vNw);
  vec3 Vd=normalize(vPw-cameraPosition);
  float f=clamp(dot(N,Vd)/uEdge,0.0,1.0);
  float glow=pow(f,2.4);
  vec3 L=normalize(uSun-vPw);
  float s=dot(N,L);
  float day=smoothstep(-0.4,0.45,s);
  vec3 col=mix(uSunset,uCol,smoothstep(-0.15,0.35,s));
  gl_FragColor=vec4(col*glow*day*uAmt,1.0);
}
`;

/* ---------- Rings ---------- */
const RING_VERT = /* glsl */`
varying vec3 vPos; varying vec3 vPw;
void main(){ vPos=position; vec4 wp=modelMatrix*vec4(position,1.0); vPw=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }
`;
const RING_FRAG = /* glsl */`
uniform float uInner; uniform float uOuter; uniform float uStyle; uniform float uOpacity;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uSun; uniform vec3 uPlanetPos; uniform float uPlanetR; uniform float uLightBoost;
varying vec3 vPos; varying vec3 vPw;
float hash(float n){return fract(sin(n)*43758.5453);}
float vn(float x){float i=floor(x),f=fract(x);return mix(hash(i),hash(i+1.0),f*f*(3.0-2.0*f));}
float gring(float t,float c,float s0,float fw){float s=max(s0,fw);return exp(-pow((t-c)/s,2.0))*(s0/s);}
void main(){
  float r=length(vPos.xy);
  float t=(r-uInner)/(uOuter-uInner);
  if(t<0.0||t>1.0) discard;
  float dens; vec3 col; float fw=fwidth(t);
  if(uStyle<0.5){
    dens=smoothstep(0.0,0.05,t)*(1.0-smoothstep(0.17,0.2,t))*0.22;
    dens+=smoothstep(0.18,0.23,t)*(1.0-smoothstep(0.53,0.555,t))*0.95;
    dens+=smoothstep(0.61,0.64,t)*(1.0-smoothstep(0.9,0.925,t))*0.72;
    dens*=1.0-(1.0-smoothstep(0.0,0.006,abs(t-0.86)))*0.9;
    dens+=(1.0-smoothstep(0.0,0.005,abs(t-0.968)))*0.45;
    float fineFade=1.0-smoothstep(0.0015,0.008,fw);
    float fine=0.62+0.26*vn(t*55.0)+0.12*vn(t*170.0+3.0)+0.12*(vn(t*520.0+9.0)-0.5)*fineFade;
    dens*=fine;
    col=mix(uA,uB,smoothstep(0.15,0.6,t)*(1.0-smoothstep(0.62,0.95,t)*0.35));
    col*=0.82+0.3*vn(t*38.0+7.0);
  } else {
    float x=0.0;
    x+=gring(t,0.08,0.004,fw)*0.5;
    x+=gring(t,0.2,0.004,fw)*0.5;
    x+=gring(t,0.33,0.004,fw)*0.45;
    x+=gring(t,0.52,0.0045,fw)*0.55;
    x+=gring(t,0.62,0.0045,fw)*0.5;
    x+=gring(t,0.92,0.011,fw)*0.9;
    dens=x; col=mix(uA,uB,t);
  }
  vec3 L=normalize(uSun-vPw);
  vec3 oc=vPw-uPlanetPos;
  float b=dot(oc,L); float c=dot(oc,oc)-uPlanetR*uPlanetR; float h=b*b-c;
  float sh=1.0-step(b,0.0)*smoothstep(0.0,uPlanetR*uPlanetR*0.06,h)*0.93;
  gl_FragColor=vec4(col*sh*uLightBoost,clamp(dens,0.0,1.0)*uOpacity);
}
`;

/* ---------- Moons ---------- */
const MOON_VERT = /* glsl */`
varying vec3 vPo; varying vec3 vNw; varying vec3 vPw;
void main(){ vPo=position; vec4 wp=modelMatrix*vec4(position,1.0); vPw=wp.xyz; vNw=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }
`;
const MOON_FRAG = /* glsl */`
uniform vec3 uA; uniform vec3 uB; uniform vec3 uSun; uniform float uSeed; uniform float uTwoTone; uniform float uLightBoost;
varying vec3 vPo; varying vec3 vNw; varying vec3 vPw;
${GLSL_NOISE}
void main(){
  vec3 p=normalize(vPo);
  float n=fbm4(p*3.0+uSeed)+0.4*fbm4(p*9.0+uSeed);
  vec3 col=mix(uB,uA,smoothstep(-0.5,0.5,n));
  col=mix(col,uB*0.3,smoothstep(0.25,-0.25,p.x)*uTwoTone);
  vec3 N=normalize(vNw); vec3 L=normalize(uSun-vPw);
  float ndl=dot(N,L);
  float lit=max(ndl,0.0)*smoothstep(-0.1,0.15,ndl);
  gl_FragColor=vec4(col*(lit*1.1*uLightBoost+0.02),1.0);
}
`;

/* ---------- Sun ---------- */
const SUN_VERT = /* glsl */`
varying vec3 vPo; varying vec3 vNw; varying vec3 vPw;
void main(){ vPo=position; vec4 wp=modelMatrix*vec4(position,1.0); vPw=wp.xyz; vNw=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }
`;
const SUN_FRAG = /* glsl */`
uniform float uTime;
varying vec3 vPo; varying vec3 vNw; varying vec3 vPw;
${GLSL_NOISE}
void main(){
  vec3 p=normalize(vPo);
  float n=fbm4(p*3.5+vec3(uTime*0.02,uTime*0.013,0.0));
  float n2=fbm4(p*11.0-vec3(0.0,uTime*0.04,uTime*0.03));
  float g=0.5+0.5*(n*0.6+n2*0.55);
  vec3 V=normalize(cameraPosition-vPw);
  float mu=max(dot(normalize(vNw),V),0.0);
  float limb=pow(mu,0.5);
  vec3 cool=vec3(0.95,0.32,0.06), mid=vec3(1.5,0.82,0.3), hot=vec3(1.9,1.55,1.05);
  vec3 col=mix(cool,mid,smoothstep(0.15,0.6,g));
  col=mix(col,hot,smoothstep(0.55,0.95,g));
  float spot=smoothstep(0.55,0.72,fbm4(p*2.2+vec3(11.0,uTime*0.004,0.0)))*(1.0-smoothstep(0.35,0.55,abs(p.y)));
  col*=1.0-spot*0.55;
  col*=mix(0.5,1.1,limb);
  col+=vec3(1.0,0.45,0.1)*pow(1.0-mu,3.0)*0.6;
  gl_FragColor=vec4(col,1.0);
}
`;
const CORONA_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const CORONA_FRAG = /* glsl */`
uniform float uTime; uniform float uR; uniform float uOpacity;
varying vec2 vUv;
${GLSL_NOISE}
void main(){
  float r=length(vUv);
  if(r>1.0) discard;
  float a=atan(vUv.y,vUv.x);
  vec2 dir=vec2(cos(a),sin(a));
  float rays=fbm4(vec3(dir*2.2,uTime*0.05))*0.5+0.5;
  float rays2=fbm4(vec3(dir*7.0,uTime*0.08+3.0))*0.5+0.5;
  float x=max(r-uR,0.0);
  float fall=exp(-x*9.0)*0.9+exp(-x*3.2)*0.25;
  float streak=pow(rays,2.5)*exp(-x*3.5)*1.2+pow(rays2,4.0)*exp(-x*6.0)*0.8;
  float v=(fall*(0.6+0.4*rays)+streak)*smoothstep(uR*0.96,uR*1.02,r)*(1.0-smoothstep(0.75,1.0,r));
  vec3 col=mix(vec3(1.0,0.45,0.12),vec3(1.0,0.85,0.6),exp(-x*6.0));
  gl_FragColor=vec4(col*v*uOpacity,1.0);
}
`;

/* ---------- Points: stars, dust, wind ---------- */
const STAR_VERT = /* glsl */`
attribute float aSize; attribute vec3 aColor; attribute float aPhase;
uniform float uTime; uniform float uPR;
varying vec3 vColor; varying float vTw;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  float tw=0.72+0.28*sin(uTime*(0.6+aPhase*1.7)+aPhase*40.0);
  vTw=tw; vColor=aColor;
  gl_PointSize=aSize*uPR*(0.85+0.3*tw);
  gl_Position=projectionMatrix*mv;
}
`;
const STAR_FRAG = /* glsl */`
uniform float uOpacity;
varying vec3 vColor; varying float vTw;
void main(){
  vec2 c=gl_PointCoord-0.5; float d=dot(c,c);
  float a=exp(-d*34.0)+exp(-d*9.0)*0.18;
  gl_FragColor=vec4(vColor*a*vTw*uOpacity,1.0);
}
`;
const DUST_VERT = /* glsl */`
attribute float aSize; attribute float aShade;
uniform float uPR; uniform float uScale;
varying float vShade;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  vShade=aShade;
  gl_PointSize=clamp(aSize*uPR*uScale/max(-mv.z,1.0),0.0,6.0*uPR);
  gl_Position=projectionMatrix*mv;
}
`;
const DUST_FRAG = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying float vShade;
void main(){
  vec2 c=gl_PointCoord-0.5; float d=dot(c,c);
  float a=smoothstep(0.25,0.0,d);
  gl_FragColor=vec4(uColor*vShade,a*uOpacity);
}
`;
const WIND_VERT = /* glsl */`
attribute vec3 aDir; attribute float aSeed;
uniform float uTime; uniform float uPR;
varying float vA;
void main(){
  float t=fract(uTime*(0.012+aSeed*0.012)+aSeed);
  float r=11.0+t*150.0;
  vec3 p=aDir*r;
  vA=(1.0-t)*smoothstep(0.0,0.05,t);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  gl_PointSize=clamp(90.0*uPR/max(-mv.z,1.0),0.0,3.0*uPR);
  gl_Position=projectionMatrix*mv;
}
`;
const WIND_FRAG = /* glsl */`
uniform float uOpacity;
varying float vA;
void main(){
  vec2 c=gl_PointCoord-0.5; float d=dot(c,c);
  float a=smoothstep(0.25,0.0,d)*vA*uOpacity;
  gl_FragColor=vec4(vec3(1.0,0.7,0.4)*a,1.0);
}
`;

/* ---------- Orbit line with trail ---------- */
const ORBIT_VERT = /* glsl */`
attribute float aT; varying float vT;
void main(){ vT=aT; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const ORBIT_FRAG = /* glsl */`
uniform float uAngle; uniform vec3 uColor; uniform float uBase; uniform float uTrail; uniform float uOpacity;
varying float vT;
void main(){
  float behind=fract(uAngle-vT);
  float tr=exp(-behind*10.0);
  float a=(uBase+uTrail*tr)*uOpacity;
  gl_FragColor=vec4(uColor,a);
}
`;

/* ---------- Gravity-well grid ---------- */
const GRID_VERT = /* glsl */`
uniform vec4 uBodies[9];
varying vec2 vXZ; varying float vDepth;
void main(){
  vec4 wp=modelMatrix*vec4(position,1.0);
  float y=0.0;
  for(int i=0;i<9;i++){ vec2 dd=wp.xz-uBodies[i].xy; y-=uBodies[i].z/sqrt(dot(dd,dd)+uBodies[i].w); }
  wp.y+=y;
  vXZ=wp.xz; vDepth=-y;
  gl_Position=projectionMatrix*viewMatrix*wp;
}
`;
const GRID_FRAG = /* glsl */`
uniform float uOpacity; uniform vec3 uCool; uniform vec3 uWarm;
varying vec2 vXZ; varying float vDepth;
void main(){
  vec2 q=vXZ/12.0;
  vec2 g=abs(fract(q-0.5)-0.5)/fwidth(q);
  float line=1.0-min(min(g.x,g.y),1.0);
  float rr=length(vXZ);
  float fade=1.0-smoothstep(170.0,330.0,rr);
  vec3 col=mix(uCool,uWarm,clamp((vDepth-6.0)/40.0,0.0,1.0));
  gl_FragColor=vec4(col,line*fade*uOpacity*0.55*(0.45+0.55*clamp(vDepth/20.0,0.0,1.0)));
}
`;
