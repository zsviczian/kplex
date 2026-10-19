/** Geometric coverage and finite public opacity policy for the production viewport underlay. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:{compassPolygons,compassCssIntensity,compassIntensity,defaultColorPreferences}}=loadPortableModules(['src/core/plex/compassBackground.ts','src/core/plex/colorPreferences.ts']);
/** Normalize before measuring area so giant finite coordinates never overflow the acceptance calculation. */
function area(points,w,h){let sum=0;for(let n=0;n<points.length;n++){const a=points[n],b=points[(n+1)%points.length];sum+=(a.x/w)*(b.y/h)-(a.y/h)*(b.x/w)}return Math.abs(sum)/2}
/** Determine strict convex inclusion, ignoring shared boundaries where multiple polygons intentionally meet. */
function inside(points,p){if(points.length<3)return false;let sign=0;for(let n=0;n<points.length;n++){const a=points[n],b=points[(n+1)%points.length],cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(Math.abs(cross)<1e-8)return false;const s=Math.sign(cross);if(sign&&s!==sign)return false;sign=s}return true}
test('four bounded polygons cover ordinary, asymmetric and offscreen viewports without overlap or overflow',()=>{
 for(let n=0;n<1200;n++){
  const w=1+(n*127)%2000,h=1+(n*233)%1600,apex={x:((n*37)%4000)-1000,y:((n*61)%3200)-800};
  const shapes=compassPolygons(w,h,apex);assert.deepEqual(Object.keys(shapes),['north','east','south','west']);let total=0;
  for(const points of Object.values(shapes)){assert(points.length<=6);for(const p of points){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h)}total+=area(points,w,h)}
  assert(Math.abs(total-1)<1e-10,'viewport coverage '+n);
  const sample={x:w*.413121,y:h*.631237};assert.equal(Object.values(shapes).filter(points=>inside(points,sample)).length,1,'unique interior coverage '+n);
 }
 for(const apex of [{x:1e308,y:-1e308},{x:-1e308,y:1e308}])for(const points of Object.values(compassPolygons(1e308,8e307,apex)))for(const p of points)assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
});
test('cardinal meanings remain fixed and invalid or missing centers paint no sectors',()=>{
 const shapes=compassPolygons(200,200,{x:100,y:100});
 for(const [direction,p]of Object.entries({north:{x:100,y:10},east:{x:190,y:100},south:{x:100,y:190},west:{x:10,y:100}}))assert(inside(shapes[direction],p));
 for(const [w,h,p]of [[0,10,{x:1,y:1}],[-1,10,{x:1,y:1}],[10,Infinity,{x:1,y:1}],[10,10,{x:NaN,y:1}],[10,10,null]])assert(Object.values(compassPolygons(w,h,p)).every(points=>points.length===0));
});
test('opacity inherits mode or finite CSS, preserves explicit zero and rejects nonnumeric units',()=>{
 const p=defaultColorPreferences();assert.equal(compassIntensity(p,'light'),.07);assert.equal(compassIntensity(p,'dark'),.07);
 for(const [raw,value]of [['.08',.08],['8%',.08],['0',0],['100%',.15],['1',.15]])assert.equal(compassCssIntensity(raw),value);
 for(const raw of ['','12px','calc(.05 + .02)','NaN','Infinity','8% trailing'])assert.equal(compassCssIntensity(raw),undefined);
 assert.equal(compassIntensity(p,'dark','12px'),.07);assert.equal(compassIntensity(p,'light','8%'),.08);
 p.compass.intensity=0;assert.equal(compassIntensity(p,'dark','.12'),0);p.compass.intensity=15;assert.equal(compassIntensity(p,'light','0'),.15);
});
