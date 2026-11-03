/** Finite Obsidian glyph boundary for production saved-pin components in Chromium. No navigation,
 * graph, settings or gesture owner is replaced; the host supplies only an inert SVG glyph. */
export const nativeIconBoundary={name:'native-icon-boundary',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'icons',namespace:'native-icons'}));
 builder.onLoad({filter:/.*/,namespace:'native-icons'},()=>({contents:`export function getIcon(name){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('data-icon',name);return icon}` }));
}};
