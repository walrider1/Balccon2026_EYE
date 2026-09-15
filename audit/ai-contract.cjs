const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../terminal-sketch');
let request;
const context=vm.createContext({require,__dirname:root,module:{exports:{}},console,process:{env:{OPENAI_API_KEY:'mock-only'}},fetch:async(url,options)=>{request={url,...options}; return {ok:true,json:async()=>({output_text:JSON.stringify({message:'Test reply',mood:'INVALID_MOOD',intent:'INVALID_INTENT',trust_delta:-999,suspicion_delta:999})})};}});
vm.runInContext(fs.readFileSync(path.join(root,'central-ai.js'),'utf8'),context);
(async()=>{
const reply=await context.module.exports.centralReply({kind:'message',text:'hello',state:{access:0},history:[]});
const result={mockOnly:true,reply,timeoutSignalPresent:Boolean(request.signal),structuredOutputSchemaPresent:Boolean(JSON.parse(request.body).text?.format),forbiddenLoreIncludedAtAccessZero:JSON.parse(request.body).input.includes('HRTOK caused many deaths directly.')};
fs.writeFileSync(path.join(__dirname,'ai-contract-results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
})();
