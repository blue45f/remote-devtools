var m=Object.defineProperty;var h=(l,t)=>{for(var e in t)m(l,e,{get:t[e],enumerable:!0})};function b(){return!!localStorage.getItem("debugAiCodeCompletionEnabled")}function u(...l){b()&&console.log(...l)}function C(l){l?localStorage.setItem("debugAiCodeCompletionEnabled","true"):localStorage.removeItem("debugAiCodeCompletionEnabled")}globalThis.setDebugAiCodeCompletionEnabled=C;var g={};h(g,{AiCodeCompletion:()=>p,consoleAdditionalContextFileContent:()=>f});import*as n from"./../../core/host/host.js";import*as s from"./../../core/root/root.js";var f=`/**
 * This file describes the execution environment of the Chrome DevTools Console.
 * The code is JavaScript, but with special global functions and variables.
 * Top-level await is available.
 * The console has direct access to the inspected page's \`window\` and \`document\`.
 */

/**
 * @description Returns the value of the most recently evaluated expression.
 */
let $_;

/**
 * @description A reference to the most recently selected DOM element.
 * $0, $1, $2, $3, $4 can be used to reference the last five selected DOM elements.
 */
let $0;

/**
 * @description A query selector alias. $$('.my-class') is equivalent to document.querySelectorAll('.my-class').
 */
function $$(selector, startNode) {}

/**
 * @description An XPath selector. $x('//p') returns an array of all <p> elements.
 */
function $x(path, startNode) {}

function clear() {}

function copy(object) {}

/**
 * @description Selects and reveals the specified element in the Elements panel.
 */
function inspect(object) {}

function keys(object) {}

function values(object) {}

/**
 * @description When the specified function is called, the debugger is invoked.
 */
function debug(func) {}

/**
 * @description Stops the debugging of the specified function.
 */
function undebug(func) {}

/**
 * @description Logs a message to the console whenever the specified function is called,
 * along with the arguments passed to it.
 */
function monitor(func) {}

/**
 * @description Stops monitoring the specified function.
 */
function unmonitor(func) {}

/**
 * @description Logs all events dispatched to the specified object to the console.
 */
function monitorEvents(object, events) {}

/**
 * @description Returns an object containing all event listeners registered on the specified object.
 */
function getEventListeners(object) {}

/**
 * The global \`console\` object has several helpful methods
 */
const console = {
  log: (...args) => {},
  warn: (...args) => {},
  error: (...args) => {},
  info: (...args) => {},
  debug: (...args) => {},
  assert: (assertion, ...args) => {},
  dir: (object) => {}, // Displays an interactive property listing of an object.
  dirxml: (object) => {}, // Displays an XML/HTML representation of an object.
  table: (data, columns) => {}, // Displays tabular data as a table.
  group: (label) => {}, // Creates a new inline collapsible group.
  groupEnd: () => {},
  time: (label) => {}, // Starts a timer.
  timeEnd: (label) => {} // Stops a timer and logs the elapsed time.
};`,p=class{#i;#o;#e;#n;#s;#l=crypto.randomUUID();#t;#a;constructor(t,e,o,i){this.#t=t.aidaClient,this.#a=t.serverSideLoggingEnabled??!1,this.#n=e,this.#i=i??[],this.#s=o}#c(t,e,o="JAVASCRIPT",i){let d=n.AidaClient.convertToUserTierEnum(this.#u);function a(c){return typeof c=="number"&&c>=0?c:void 0}t=`
`+t;let r=i;return r||(r=this.#n==="console"?[{path:"devtools-console-context.js",content:f,included_reason:n.AidaClient.Reason.RELATED_FILE}]:void 0),{client:n.AidaClient.CLIENT_NAME,prefix:t,suffix:e,options:{inference_language:o,temperature:a(this.#r.temperature),model_id:this.#r.modelId||void 0,stop_sequences:this.#i},metadata:{disable_user_content_logging:!(this.#a??!1),string_session_id:this.#l,user_tier:d,client_version:s.Runtime.getChromeVersion()},additional_files:r}}async#d(t){let e=this.#p(t);if(e)return{response:e,fromCache:!0};let o=await this.#t.completeCode(t);return o?(this.#f(t,o),{response:o,fromCache:!1}):{response:null,fromCache:!1}}get#u(){return s.Runtime.hostConfig.devToolsAiCodeCompletion?.userTier}get#r(){let t=s.Runtime.hostConfig.devToolsAiCodeCompletion?.temperature,e=s.Runtime.hostConfig.devToolsAiCodeCompletion?.modelId;return{temperature:t,modelId:e}}#p(t){if(!this.#e||this.#e.request.suffix!==t.suffix||JSON.stringify(this.#e.request.options)!==JSON.stringify(t.options))return null;let e=[];for(let o of this.#e.response.generatedSamples){let i=this.#e.request.prefix+o.generationString;i.startsWith(t.prefix)&&e.push({generationString:i.substring(t.prefix.length),sampleId:o.sampleId,score:o.score,attributionMetadata:o.attributionMetadata})}return e.length===0?null:{generatedSamples:e,metadata:this.#e.response.metadata}}#f(t,e){this.#e={request:t,response:e}}registerUserImpression(t,e,o){let i=Math.floor(e/1e3),d=e%1e3,a=Math.floor(d*1e6);this.#t.registerClientEvent({corresponding_aida_rpc_global_id:t,disable_user_content_logging:!0,complete_code_client_event:{user_impression:{sample:{sample_id:o},latency:{duration:{seconds:i,nanos:a}}}}}),u("Registered user impression with latency {seconds:",i,", nanos:",a,"}"),n.userMetrics.actionTaken(n.UserMetrics.Action.AiCodeCompletionSuggestionDisplayed)}registerUserAcceptance(t,e){this.#t.registerClientEvent({corresponding_aida_rpc_global_id:t,disable_user_content_logging:!0,complete_code_client_event:{user_acceptance:{sample:{sample_id:e}}}}),u("Registered user acceptance"),n.userMetrics.actionTaken(n.UserMetrics.Action.AiCodeCompletionSuggestionAccepted)}clearCachedRequest(){this.#e=void 0}async completeCode(t,e,o,i,d){let a=this.#c(t,e,i,d),{response:r,fromCache:c}=await this.#d(a);return u("At cursor position",o,{request:a,response:r,fromCache:c}),r?{response:r,fromCache:c}:{response:null,fromCache:!1}}remove(){this.#o&&(clearTimeout(this.#o),this.#o=void 0),this.#s?.setAiAutoCompletion(null)}static isAiCodeCompletionEnabled(t){if(!t.startsWith("en-"))return!1;let e=s.Runtime.hostConfig.aidaAvailability;return!e||e.blockedByGeo||e.blockedByAge||e.blockedByEnterprisePolicy?!1:!!(e.enabled&&s.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled)}static isAiCodeCompletionStylesEnabled(t){if(!t.startsWith("en-"))return!1;let e=s.Runtime.hostConfig.aidaAvailability;return!e||e.blockedByGeo||e.blockedByAge||e.blockedByEnterprisePolicy?!1:!!(e.enabled&&s.Runtime.hostConfig.devToolsAiCodeCompletionStyles?.enabled)}};export{g as AiCodeCompletion,u as debugLog,b as isDebugMode};
//# sourceMappingURL=ai_code_completion.js.map
