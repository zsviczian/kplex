/** Inert Markdown projection for trusted API context. Authored strings remain quoted data in
 * CommonMark code spans, never links, embeds, raw HTML or formatting. No renderer or host effects. */

/** Encode newlines/controls as JSON text and choose a code-span delimiter longer than every
 * authored backtick run. Padding protects delimiter-adjacent backticks under CommonMark's
 * normalization rules. JSON quotes make even an empty/all-space string unambiguous. */
export function publicApiMarkdownLiteral(value:string|null):string {
  const text=JSON.stringify(value);let run=0,longest=0;
  for(const character of text){if(character==='`'){run++;longest=Math.max(longest,run);}else run=0;}
  const delimiter='`'.repeat(longest+1);
  return `${delimiter} ${text} ${delimiter}`;
}
