/**
 * Shared trusted HTML drag transport for the serial native interaction driver. Electron's mouse
 * injection alone can enter an OS drag loop without delivering a drop. This finite test helper
 * intercepts Chromium's own drag data, delivers it through CDP and always cancels/releases its
 * exclusive debugger. It proves renderer delivery, not a physical cross-window OS gesture.
 */

/** Deliver one native body drag without manufacturing its payload or retaining a debugger lease. */
export async function nativeHtmlDrag({contents,from,to,input,wait,until}) {
  const debug=contents.debugger;
  if(debug.isAttached())throw Error('Native body drag requires exclusive debugger ownership');
  let data=null,owned=false;
  /** Capture only Chromium's current gesture; the caller owns all fixture/drop assertions. */
  const intercepted=(_event,method,parameters)=>{if(method==='Input.dragIntercepted')data=parameters.data};
  try{
    debug.attach('1.3');owned=true;debug.on('message',intercepted);
    await debug.sendCommand('Input.setInterceptDrags',{enabled:true});
    input('mouseMove',from);await wait(80);input('mouseDown',from);await wait(80);
    input('mouseMove',to,['leftButtonDown']);await wait(180);
    await until(()=>data,'Chromium did not intercept the trusted node-body drag');
    for(const type of ['dragEnter','dragOver','drop'])await debug.sendCommand('Input.dispatchDragEvent',{type,x:to.x,y:to.y,data});
    return{chromiumInterceptedData:true,mimeTypes:data.items.map(item=>item.mimeType),dragOperationsMask:data.dragOperationsMask};
  }finally{
    try{if(owned){try{await debug.sendCommand('Input.cancelDragging');await debug.sendCommand('Input.setInterceptDrags',{enabled:false})}
      finally{debug.removeListener('message',intercepted);if(debug.isAttached())debug.detach()}}}
    finally{input('mouseUp',to)}
  }
}
