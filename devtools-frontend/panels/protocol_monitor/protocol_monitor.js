var be=Object.defineProperty;var Y=(s,e)=>{for(var o in e)be(s,o,{get:e[o],enumerable:!0})};var se={};Y(se,{DEFAULT_VIEW:()=>oe,JSONEditor:()=>P,suggestionFilter:()=>ee});import"./../../ui/kit/kit.js";import"./../../ui/components/menus/menus.js";import*as X from"./../../core/common/common.js";import*as q from"./../../core/host/host.js";import*as H from"./../../core/i18n/i18n.js";import*as U from"./../../core/sdk/sdk.js";import"./../../ui/components/buttons/buttons.js";import*as I from"./../../ui/components/suggestion_input/suggestion_input.js";import*as A from"./../../ui/legacy/legacy.js";import*as $e from"./../../ui/lit/lit.js";import*as x from"./../../ui/visual_logging/visual_logging.js";import*as Z from"./../elements/components/components.js";var Q=`*{box-sizing:border-box;padding:0;margin:0;font-size:inherit}:host{display:flex;flex-direction:column;height:100%}.target-selector{max-width:var(--sys-size-21)}.warning-icon{margin-left:-18px;margin-right:4px}.row{flex-wrap:wrap}.row,
.row-icons{display:flex;flex-direction:row;color:var(--sys-color-token-property-special);font-family:var(--monospace-font-family);font-size:var(--monospace-font-size);align-items:center;line-height:18px;margin-top:3px}.separator{margin-right:0.5em;color:var(--sys-color-on-surface)}ul{padding-left:2em}.optional-parameter{color:var(--sys-color-token-attribute-value);--override-color-recorder-input:var(--sys-color-on-surface)}.undefined-parameter{color:var(--sys-color-state-disabled)}.wrapper{display:flex;flex-direction:column;height:100%}.editor-wrapper{padding-left:1em;overflow-x:hidden;flex-grow:1;padding-bottom:50px;padding-top:0.5em}.clear-button,
.add-button,
.delete-button{opacity:0%;transition:opacity 0.3s ease-in-out}.clear-button,
.delete-button{margin-left:5px}.row:focus-within .delete-button,
.row:focus-within .add-button,
.row:focus-within .clear-button,
.row:hover .delete-button,
.row:hover .add-button,
.row:hover .clear-button{opacity:100%}.protocol-monitor-sidebar-toolbar{border-top:1px solid var(--sys-color-divider)}
/*# sourceURL=${import.meta.resolve("./JSONEditor.css")} */`;var{html:p,render:we,Directives:Ce,nothing:h}=$e,{live:w,classMap:V,repeat:Se}=Ce,u={deleteParameter:"Delete parameter",addParameter:"Add a parameter",resetDefaultValue:"Reset to default value",addCustomProperty:"Add custom property",sendCommandCtrlEnter:"Send command - Ctrl+Enter",sendCommandCmdEnter:"Send command - \u2318+Enter",copyCommand:"Copy command",selectTarget:"Select a target"},Te=H.i18n.registerUIStrings("panels/protocol_monitor/JSONEditor.ts",u),f=H.i18n.getLocalizedString.bind(void 0,Te),Ie=s=>{if(s.length>150){let[e,o]=s.split(".");return e+"",[e,o]}return[s,""]},b=new Map([["string",""],["number",0],["boolean",!1]]),T="dummy",k="<empty_string>";function ee(s,e){return s.toLowerCase().includes(e.toLowerCase())}var P=class extends X.ObjectWrapper.eventMixin(A.Widget.VBox){#t=new Map;#e=new Map;#a=new Map;#i=[];#s=[];#l="";#n;#o;#c;constructor(e,o=oe){super(e,{useShadowDom:!0}),this.#c=o,this.registerRequiredCSS(Q)}get metadataByCommand(){return this.#t}set metadataByCommand(e){this.#t=e,this.requestUpdate()}get typesByName(){return this.#e}set typesByName(e){this.#e=e,this.requestUpdate()}get enumsByName(){return this.#a}set enumsByName(e){this.#a=e,this.requestUpdate()}get parameters(){return this.#i}set parameters(e){this.#i=e,this.requestUpdate()}get targets(){return this.#s}set targets(e){this.#s=e,this.requestUpdate()}get command(){return this.#l}set command(e){this.#l!==e&&(this.#l=e,this.requestUpdate())}get targetId(){return this.#n}set targetId(e){this.#n!==e&&(this.#n=e,this.requestUpdate())}wasShown(){super.wasShown(),this.#o=new A.PopoverHelper.PopoverHelper(this.contentElement,o=>this.#S(o),"protocol-monitor.hint"),this.#o.setDisableOnClick(!0),this.#o.setTimeout(300),U.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged",this.#r,this),this.#r(),this.requestUpdate()}willHide(){super.willHide(),this.#o?.hidePopover(),this.#o?.dispose(),U.TargetManager.TargetManager.instance().removeEventListener("AvailableTargetsChanged",this.#r,this)}#r(){this.targets=U.TargetManager.TargetManager.instance().targets(),this.targets.length&&this.targetId===void 0&&(this.targetId=this.targets[0].id())}getParameters(){let e=t=>{if(t.value!==void 0)switch(t.type){case"number":return Number(t.value);case"boolean":return!!t.value;case"object":{let a={};for(let r of t.value)e(r)!==void 0&&(a[r.name]=e(r));return Object.keys(a).length===0?void 0:a}case"array":{let a=[];for(let r of t.value)a.push(e(r));return a.length===0?[]:a}default:return t.value}},o={};for(let t of this.parameters)o[t.name]=e(t);return e({type:"object",name:T,optional:!0,value:this.parameters,description:""})}displayCommand(e,o,t){this.targetId=t,this.command=e;let a=this.metadataByCommand.get(this.command);if(!a?.parameters)return;this.populateParametersForCommandWithDefaultValues();let r=this.#d("",o,{typeRef:T,type:"object",name:"",description:"",optional:!0,value:[]},a.parameters).value,n=new Map(this.parameters.map(l=>[l.name,l]));for(let l of r){let c=n.get(l.name);c&&(c.value=l.value)}this.requestUpdate()}#d(e,o,t,a){let r=t?.type||typeof o,n=t?.description??"",l=t?.optional??!0;switch(r){case"string":case"boolean":case"number":return this.#u(e,o,t);case"object":return this.#g(e,o,t,a);case"array":return this.#C(e,o,t)}return{type:r,name:e,optional:l,typeRef:t?.typeRef,value:o,description:n}}#u(e,o,t){let a=t?.type||typeof o,r=t?.description??"",n=t?.optional??!0;return{type:a,name:e,optional:n,typeRef:t?.typeRef,value:o,description:r,isCorrectType:t?this.#y(t,String(o)):!0}}#g(e,o,t,a){let r=t?.description??"";if(typeof o!="object"||o===null)throw new Error("The value is not an object");let n=t?.typeRef;if(!n)throw new Error("Every object parameters should have a type ref");let l=n===T?a:this.typesByName.get(n);if(!l)throw new Error("No nested type for keys were found");let c=[];for(let m of Object.keys(o)){let y=l.find(K=>K.name===m);c.push(this.#d(m,o[m],y))}return{type:"object",name:e,optional:t.optional,typeRef:t.typeRef,value:c,description:r,isCorrectType:!0}}#C(e,o,t){let a=t?.description??"",r=t?.optional??!0,n=t?.typeRef;if(!n)throw new Error("Every array parameters should have a type ref");if(!Array.isArray(o))throw new Error("The value is not an array");let l=L(n)?void 0:{optional:!0,type:"object",value:[],typeRef:n,description:"",name:""},c=[];for(let m=0;m<o.length;m++){let y=this.#d(`${m}`,o[m],l);c.push(y)}return{type:"array",name:e,optional:r,typeRef:t?.typeRef,value:c,description:a,isCorrectType:!0}}#S(e){let o=e.composedPath()[0],t=this.#T(o);if(!t?.description)return null;let[a,r]=Ie(t.description),n=t.type,l=t.replyArgs,c="";return l&&l.length>0?c=r+`Returns: ${l}<br>`:n?c=r+`<br>Type: ${n}<br>`:c=r,{box:o.boxInWindow(),show:async m=>{let y=new Z.CSSHintDetailsView.CSSHintDetailsView({getMessage:()=>`<span>${a}</span>`,getPossibleFixMessage:()=>c,getLearnMoreLink:()=>`https://chromedevtools.github.io/devtools-protocol/tot/${this.command.split(".")[0]}/`});return m.contentElement.appendChild(y),!0}}}#T(e){if(e.matches(".command")){let o=this.metadataByCommand.get(this.command);if(o)return{description:o.description,replyArgs:o.replyArgs}}if(e.matches(".parameter")){let o=e.dataset.paramid;if(!o)return;let t=o.split("."),{parameter:a}=this.#m(t);return a.description?{description:a.description,type:a.type}:void 0}}getCommandJson(){return this.command!==""?JSON.stringify({command:this.command,parameters:this.getParameters()}):""}#I(){let e=this.getCommandJson();q.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(e)}#f(){this.dispatchEventToListeners("submiteditor",{command:this.command,parameters:this.getParameters(),targetId:this.targetId})}populateParametersForCommandWithDefaultValues(){let e=this.metadataByCommand.get(this.command)?.parameters;e&&(this.parameters=e.map(o=>this.#p(o)))}#p(e){if(e.type==="object"){let o=e.typeRef;o||(o=T);let a=(this.typesByName.get(o)??[]).map(r=>this.#p(r));return{...e,value:e.optional?void 0:a,isCorrectType:!0}}return e.type==="array"?{...e,value:e?.optional?void 0:e.value?.map(o=>this.#p(o))||[],isCorrectType:!0}:{...e,value:e.optional?void 0:b.get(e.type),isCorrectType:!0}}#m(e){let o=this.parameters,t;for(let a=0;a<e.length;a++){let r=e[a],n=o.find(l=>l.name===r);if(a===e.length-1)return{parameter:n,parentParameter:t};if(n?.type==="array"||n?.type==="object")n.value&&(o=n.value);else throw new Error("Parameter on the path in not an object or an array");t=n}throw new Error("Not found")}#y(e,o){if(e.type==="number"&&isNaN(Number(o)))return!1;let t=this.#w(e);return!(t.length!==0&&!t.includes(o))}#v=e=>{if(!(e.target instanceof I.SuggestionInput.SuggestionInput))return;let o;if(e instanceof KeyboardEvent){let n=e.target.renderRoot.querySelector("devtools-editable-content");if(!n)return;o=n.innerText}else o=e.target.value;let t=e.target.getAttribute("data-paramid");if(!t)return;let a=t.split("."),r=this.#m(a).parameter;o===""?r.value=b.get(r.type):(r.value=o,r.isCorrectType=this.#y(r,o)),this.requestUpdate()};#P=e=>{if(!(e.target instanceof I.SuggestionInput.SuggestionInput))return;let o=e.target.value,t=e.target.getAttribute("data-paramid");if(!t)return;let a=t.split("."),{parameter:r}=this.#m(a);r.name=o,this.requestUpdate()};#b=e=>{e.target instanceof I.SuggestionInput.SuggestionInput&&e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&this.#v(e)};#x(e){if(!(e.target instanceof I.SuggestionInput.SuggestionInput))return;let o=e.target.getAttribute("data-paramid");if(!o)return;let t=o.split("."),a=this.#m(t).parameter;a.isCorrectType=!0,this.requestUpdate()}#j=async e=>{e.target instanceof I.SuggestionInput.SuggestionInput&&(this.command=e.target.value),this.populateParametersForCommandWithDefaultValues();let o=e.target;await this.updateComplete,this.#M(o)};#M(e){let o=this.contentElement.querySelectorAll("devtools-suggestion-input,.add-button"),t=[...o].findIndex(a=>a===e.shadowRoot?.host);t>=0&&t+1<o.length?o[t+1].focus():this.contentElement.querySelector('devtools-button[jslogcontext="protocol-monitor.send-command"]')?.focus()}#h(e,o){if(e.type==="object"){let t=e.typeRef;t||(t=T);let r=(this.typesByName.get(t)??[]).map(n=>this.#h(n,n.name));return{type:"object",name:o,optional:e.optional,typeRef:t,value:r,isCorrectType:!0,description:e.description}}return{type:e.type,name:o,optional:e.optional,isCorrectType:!0,typeRef:e.typeRef,value:e.optional?void 0:b.get(e.type),description:e.description}}#N(e){let o=e.split("."),{parameter:t,parentParameter:a}=this.#m(o);if(t){switch(t.type){case"array":{let r=t.typeRef;if(!r)throw new Error("Every array parameter must have a typeRef");let n=this.typesByName.get(r)??[],l=n.map(m=>this.#h(m,m.name)),c=L(r)?r:"object";n.length===0&&this.enumsByName.get(r)&&(c="string"),t.value||(t.value=[]),t.value.push({type:c,name:String(t.value.length),optional:!0,typeRef:r,value:l.length!==0?l:"",description:"",isCorrectType:!0});break}case"object":{let r=t.typeRef;if(r||(r=T),t.value||(t.value=[]),!this.typesByName.get(r)){t.value.push({type:"string",name:"",optional:!0,value:"",isCorrectType:!0,description:"",isKeyEditable:!0});break}let n=this.typesByName.get(r)??[],l=n.map(m=>this.#h(m,m.name)),c=n.map(m=>this.#p(m));a?t.value.push({type:"object",name:"",optional:!0,typeRef:r,value:l,isCorrectType:!0,description:""}):t.value=c;break}default:t.value=b.get(t.type);break}this.requestUpdate()}}#$(e,o){if(e?.value!==void 0){switch(e.type){case"object":if(e.optional&&!o){e.value=void 0;break}!e.typeRef||!this.typesByName.get(e.typeRef)?e.value=[]:e.value.forEach(t=>this.#$(t,o));break;case"array":e.value=e.optional?void 0:[];break;default:e.value=e.optional?void 0:b.get(e.type),e.isCorrectType=!0;break}this.requestUpdate()}}#E(e,o){if(e&&Array.isArray(o.value)){if(o.value.splice(o.value.findIndex(t=>t===e),1),o.type==="array")for(let t=0;t<o.value.length;t++)o.value[t].name=String(t);this.requestUpdate()}}#R(e){e.target instanceof HTMLSelectElement&&(this.targetId=e.target.value),this.requestUpdate()}#w(e){if(e.type==="string"){let o=this.enumsByName.get(`${e.typeRef}`)??{};return Object.values(o)}return e.type==="boolean"?["true","false"]:[]}performUpdate(){let e={onParameterValueBlur:t=>{this.#v(t)},onParameterKeydown:t=>{this.#b(t)},onParameterFocus:t=>{this.#x(t)},onParameterKeyBlur:t=>{this.#P(t)},onKeydown:t=>{t.key==="Enter"&&(t.ctrlKey||t.metaKey)&&(this.#b(t),this.#f())},parameters:this.parameters,metadataByCommand:this.metadataByCommand,command:this.command,typesByName:this.typesByName,onCommandInputBlur:t=>this.#j(t),onCommandSend:()=>this.#f(),onCopyToClipboard:()=>this.#I(),targets:this.targets,targetId:this.targetId,onAddParameter:t=>{this.#N(t)},onClearParameter:(t,a)=>{this.#$(t,a)},onDeleteParameter:(t,a)=>{this.#E(t,a)},onTargetSelected:t=>{this.#R(t)},computeDropdownValues:t=>this.#w(t)},o={};this.#c(e,o,this.contentElement)}};function L(s){return s==="string"||s==="boolean"||s==="number"}function Pe(s){return p`
  <div class="row attribute padded">
    <div>target<span class="separator">:</span></div>
    <select class="target-selector"
            title=${f(u.selectTarget)}
            jslog=${x.dropDown("target-selector").track({change:!0})}
            @change=${s.onTargetSelected}>
      ${s.targets.map(e=>p`
        <option jslog=${x.item("target").track({click:!0,resize:!0})}
                value=${e.id()} ?selected=${e.id()===s.targetId}>
          ${e.name()} (${e.inspectedURL()})
        </option>`)}
    </select>
  </div>
`}function $(s){return p`
          <devtools-button
            title=${s.title}
            .size=${"SMALL"}
            .iconName=${s.iconName}
            .variant=${"icon"}
            class=${V(s.classMap)}
            @click=${s.onClick}
            .jslogContext=${s.jslogContext}
          ></devtools-button>
      `}function xe(){return p`<devtools-icon name='warning-filled' class='warning-icon small'>
  </devtools-icon>`}function te(s,e,o,t,a){return e.sort((r,n)=>Number(r.optional)-Number(n.optional)),p`
    <ul>
      ${Se(e,r=>{let n=t?`${a}.${r.name}`:r.name,l=r.type==="array"||r.type==="object"?r.value??[]:[],c=L(r.type),m=r.type==="array",y=t&&t.type==="array",K=t&&t.type==="object",E=r.type==="object",S=r.value===void 0,R=r.optional,G=E&&r.typeRef&&s.typesByName.get(r.typeRef)!==void 0,D=r.isKeyEditable,he=E&&!G,B=r.type==="string"||r.type==="boolean",fe=m&&!S&&r.value?.length!==0||E&&!S,ye={"optional-parameter":r.optional,parameter:!0,"undefined-parameter":r.value===void 0&&r.optional},ve={"json-input":!0};return p`
              <li class="row">
                <div class="row-icons">
                    ${r.isCorrectType?h:p`${xe()}`}

                    <!-- If an object parameter has no predefined keys, show an input to enter the key, otherwise show the name of the parameter -->
                    <div class=${V(ye)} data-paramId=${n}>
                        ${D?p`<devtools-suggestion-input
                            data-paramId=${n}
                            .isKey=${!0}
                            .isCorrectInput=${w(r.isCorrectType)}
                            .options=${B?s.computeDropdownValues(r):[]}
                            .autocomplete=${!1}
                            .value=${w(r.name??"")}
                            .placeholder=${r.value===""?k:`<${b.get(r.type)}>`}
                            @blur=${s.onParameterKeyBlur}
                            @focus=${s.onParameterFocus}
                            @keydown=${s.onParameterKeydown}
                          ></devtools-suggestion-input>`:p`${r.name}`} <span class="separator">:</span>
                    </div>

                    <!-- Render button to add values inside an array parameter -->
                    ${m?p`
                      ${$({title:f(u.addParameter),iconName:"plus",onClick:()=>s.onAddParameter(n),classMap:{"add-button":!0},jslogContext:"protocol-monitor.add-parameter"})}
                    `:h}

                    <!-- Render button to complete reset an array parameter or an object parameter-->
                    ${fe?$({title:f(u.resetDefaultValue),iconName:"clear",onClick:()=>s.onClearParameter(r,y),classMap:{"clear-button":!0},jslogContext:"protocol-monitor.reset-to-default-value"}):h}

                    <!-- Render the buttons to change the value from undefined to empty string for optional primitive parameters -->
                    ${c&&!y&&R&&S?p`  ${$({title:f(u.addParameter),iconName:"plus",onClick:()=>s.onAddParameter(n),classMap:{"add-button":!0},jslogContext:"protocol-monitor.add-parameter"})}`:h}

                    <!-- Render the buttons to change the value from undefined to populate the values inside object with their default values -->
                    ${E&&R&&S&&G?p`  ${$({title:f(u.addParameter),iconName:"plus",onClick:()=>s.onAddParameter(n),classMap:{"add-button":!0},jslogContext:"protocol-monitor.add-parameter"})}`:h}
                </div>

                <div class="row-icons">
                    <!-- If an object has no predefined keys, show an input to enter the value, and a delete icon to delete the whole key/value pair -->
                    ${D&&K?p`
                    <!-- @ts-ignore -->
                    <devtools-suggestion-input
                        data-paramId=${n}
                        .isCorrectInput=${w(r.isCorrectType)}
                        .options=${B?s.computeDropdownValues(r):[]}
                        .autocomplete=${!1}
                        .value=${w(r.value??"")}
                        .placeholder=${r.value===""?k:`<${b.get(r.type)}>`}
                        .jslogContext=${"parameter-value"}
                        @blur=${s.onParameterValueBlur}
                        @focus=${s.onParameterFocus}
                        @keydown=${s.onParameterKeydown}
                      ></devtools-suggestion-input>

                      ${$({title:f(u.deleteParameter),iconName:"bin",onClick:()=>s.onDeleteParameter(r,t),classMap:{deleteButton:!0,deleteIcon:!0},jslogContext:"protocol-monitor.delete-parameter"})}`:h}

                  <!-- In case  the parameter is not optional or its value is not undefined render the input -->
                  ${c&&!D&&(!S||!R)&&!y?p`
                      <!-- @ts-ignore -->
                      <devtools-suggestion-input
                        data-paramId=${n}
                        .strikethrough=${w(r.isCorrectType)}
                        .options=${B?s.computeDropdownValues(r):[]}
                        .autocomplete=${!1}
                        .value=${w(r.value??"")}
                        .placeholder=${r.value===""?k:`<${b.get(r.type)}>`}
                        .jslogContext=${"parameter-value"}
                        @blur=${s.onParameterValueBlur}
                        @focus=${s.onParameterFocus}
                        @keydown=${s.onParameterKeydown}
                      ></devtools-suggestion-input>`:h}

                  <!-- Render the buttons to change the value from empty string to undefined for optional primitive parameters -->
                  ${c&&!D&&!y&&R&&!S?p`  ${$({title:f(u.resetDefaultValue),iconName:"clear",onClick:()=>s.onClearParameter(r),classMap:{"clear-button":!0},jslogContext:"protocol-monitor.reset-to-default-value"})}`:h}

                  <!-- If the parameter is an object with no predefined keys, renders a button to add key/value pairs to it's value -->
                  ${he?p`
                    ${$({title:f(u.addCustomProperty),iconName:"plus",onClick:()=>s.onAddParameter(n),classMap:{"add-button":!0},jslogContext:"protocol-monitor.add-custom-property"})}
                  `:h}

                  <!-- In case the parameter is nested inside an array we render the input field as well as a delete button -->
                  ${y?p`
                  <!-- If the parameter is an object we don't want to display the input field we just want the delete button-->
                  ${E?h:p`
                  <!-- @ts-ignore -->
                  <devtools-suggestion-input
                    data-paramId=${n}
                    .options=${B?s.computeDropdownValues(r):[]}
                    .autocomplete=${!1}
                    .value=${w(r.value??"")}
                    .placeholder=${r.value===""?k:`<${b.get(r.type)}>`}
                    .jslogContext=${"parameter"}
                    @blur=${s.onParameterValueBlur}
                    @keydown=${s.onParameterKeydown}
                    class=${V(ve)}
                  ></devtools-suggestion-input>`}

                  ${$({title:f(u.deleteParameter),iconName:"bin",onClick:()=>s.onDeleteParameter(r,t),classMap:{"delete-button":!0},jslogContext:"protocol-monitor.delete-parameter"})}`:h}
                </div>
              </li>
              ${te(s,l,o,r,n)}
            `})}
    </ul>
  `}var oe=(s,e,o)=>{we(p`
    <div class="wrapper" @keydown=${s.onKeydown} jslog=${x.pane("command-editor").track({resize:!0})}>
      <div class="editor-wrapper">
        ${Pe(s)}
        <div class="row attribute padded">
          <div class="command">command<span class="separator">:</span></div>
          <devtools-suggestion-input
            .options=${[...s.metadataByCommand.keys()]}
            .value=${s.command}
            .placeholder=${"Enter your command\u2026"}
            .suggestionFilter=${ee}
            .jslogContext=${"command"}
            @blur=${s.onCommandInputBlur}
            class=${V({"json-input":!0})}
          ></devtools-suggestion-input>
        </div>
        ${s.parameters.length?p`
        <div class="row attribute padded">
          <div>parameters<span class="separator">:</span></div>
        </div>
          ${te(s,s.parameters)}
        `:h}
      </div>
      <devtools-toolbar class="protocol-monitor-sidebar-toolbar">
        <devtools-button title=${f(u.copyCommand)}
                        .iconName=${"copy"}
                        .jslogContext=${"protocol-monitor.copy-command"}
                        .variant=${"toolbar"}
                        @click=${s.onCopyToClipboard}></devtools-button>
          <div class=toolbar-spacer></div>
        <devtools-button title=${q.Platform.isMac()?f(u.sendCommandCmdEnter):f(u.sendCommandCtrlEnter)}
                        .iconName=${"send"}
                        jslogContext="protocol-monitor.send-command"
                        .variant=${"primary_toolbar"}
                        @click=${s.onCommandSend}></devtools-button>
      </devtools-toolbar>
    </div>`,o)};var ge={};Y(ge,{CommandAutocompleteSuggestionProvider:()=>O,DEFAULT_VIEW:()=>ue,InfoWidget:()=>F,ProtocolMonitorImpl:()=>W,buildProtocolMetadata:()=>me,parseCommandInput:()=>_});import"./../../ui/legacy/legacy.js";import"./../../ui/legacy/components/data_grid/data_grid.js";import*as ne from"./../../core/host/host.js";import*as z from"./../../core/i18n/i18n.js";import*as ie from"./../../core/platform/platform.js";import*as N from"./../../core/protocol_client/protocol_client.js";import*as j from"./../../core/sdk/sdk.js";import*as de from"./../../models/bindings/bindings.js";import*as le from"./../../models/text_utils/text_utils.js";import"./../../ui/components/buttons/buttons.js";import*as J from"./../../ui/legacy/components/source_frame/source_frame.js";import*as v from"./../../ui/legacy/legacy.js";import{Directives as je,html as g,render as ce}from"./../../ui/lit/lit.js";import*as C from"./../../ui/visual_logging/visual_logging.js";var re=`@scope to (devtools-widget > *){.protocol-monitor-toolbar{border-bottom:1px solid var(--sys-color-divider)}.protocol-monitor-bottom-toolbar{border-top:1px solid var(--sys-color-divider)}.target-selector{max-width:120px}.protocol-monitor-main{flex-grow:1}}
/*# sourceURL=${import.meta.resolve("./protocolMonitor.css")} */`;var{styleMap:ae}=je,{widget:M,widgetRef:Me}=v.Widget,i={method:"Method",type:"Type",request:"Request",response:"Response",timestamp:"Timestamp",elapsedTime:"Elapsed time",target:"Target",record:"Record",clearAll:"Clear all",filter:"Filter",documentation:"Documentation",editAndResend:"Edit and resend",sMs:"{PH1} ms",noMessageSelected:"No message selected",selectAMessageToView:"Select a message to see its details",save:"Save",session:"Session",sendRawCDPCommand:"Send a raw `CDP` command",sendRawCDPCommandExplanation:"Format: `'Domain.commandName'` for a command without parameters, or `'{\"command\":\"Domain.commandName\", \"parameters\": {...}}'` as a JSON object for a command with parameters. `'cmd'`/`'method'` and `'args'`/`'params'`/`'arguments'` are also supported as alternative keys for the `JSON` object.",selectTarget:"Select a target",showCDPCommandEditor:"Show CDP command editor",hideCDPCommandEditor:"Hide  CDP command editor"},Ne=z.i18n.registerUIStrings("panels/protocol_monitor/ProtocolMonitor.ts",i),d=z.i18n.getLocalizedString.bind(void 0,Ne),me=s=>{let e=new Map;for(let o of s)for(let t of Object.keys(o.metadata))e.set(t,o.metadata[t]);return e},pe=me(N.InspectorBackend.inspectorBackend.agentPrototypes.values()),Ee=N.InspectorBackend.inspectorBackend.typeMap,Re=N.InspectorBackend.inspectorBackend.enumMap,ue=(s,e,o)=>{ce(g`
        <style>${v.inspectorCommonStyles}</style>
        <style>${re}</style>
        <devtools-split-view name="protocol-monitor-split-container"
                             direction="column"
                             sidebar-initial-size="400"
                             sidebar-visibility=${s.sidebarVisible?"visible":"hidden"}
                             @change=${t=>s.onSplitChange(t.detail==="OnlyMain")}>
          <div slot="main" class="vbox protocol-monitor-main">
            <devtools-toolbar class="protocol-monitor-toolbar"
                               jslog=${C.toolbar("top")}>
               <devtools-button title=${d(i.record)}
                                .iconName=${"record-start"}
                                .toggledIconName=${"record-stop"}
                                .jslogContext=${"protocol-monitor.toggle-recording"}
                                .variant=${"icon_toggle"}
                                .toggleType=${"red-toggle"}
                                .toggled=${!0}
                                @click=${t=>s.onRecord(t.target.toggled)}>
               </devtools-button>
              <devtools-button title=${d(i.clearAll)}
                               .iconName=${"clear"}
                               .variant=${"toolbar"}
                               .jslogContext=${"protocol-monitor.clear-all"}
                               @click=${()=>s.onClear()}></devtools-button>
              <devtools-button title=${d(i.save)}
                               .iconName=${"download"}
                               .variant=${"toolbar"}
                               .jslogContext=${"protocol-monitor.save"}
                               @click=${()=>s.onSave()}></devtools-button>
              <devtools-toolbar-input type="filter"
                                      list="filter-suggestions"
                                      style="flex-grow: 1"
                                      value=${s.filter}
                                      @change=${t=>s.onFilterChanged(t.detail)}>
                <datalist id="filter-suggestions">
                  ${s.filterKeys.map(t=>g`
                        <option value=${t+":"}></option>
                        <option value=${"-"+t+":"}></option>`)}
                </datalist>
              </devtools-toolbar-input>
            </devtools-toolbar>
            <devtools-split-view direction="column" sidebar-position="second"
                                 name="protocol-monitor-panel-split" sidebar-initial-size="250">
              <devtools-data-grid
                  striped
                  slot="main"
                  .filters=${s.parseFilter(s.filter)}>
                <table>
                    <tr>
                      <th id="type" sortable style="text-align: center" hideable weight="1">
                        ${d(i.type)}
                      </th>
                      <th id="method" weight="5">
                        ${d(i.method)}
                      </th>
                      <th id="request" hideable weight="5">
                        ${d(i.request)}
                      </th>
                      <th id="response" hideable weight="5">
                        ${d(i.response)}
                      </th>
                      <th id="elapsed-time" sortable hideable weight="2">
                        ${d(i.elapsedTime)}
                      </th>
                      <th id="timestamp" sortable hideable weight="5">
                        ${d(i.timestamp)}
                      </th>
                      <th id="target" sortable hideable weight="5">
                        ${d(i.target)}
                      </th>
                      <th id="session" sortable hideable weight="5">
                        ${d(i.session)}
                      </th>
                    </tr>
                    ${s.messages.map(t=>g`
                      <tr @select=${()=>s.onSelect(t)}
                          @contextmenu=${a=>s.onContextMenu(t,a.detail)}
                          style="--override-data-grid-row-background-color: var(--sys-color-surface3)">
                        ${"id"in t?g`
                          <td title="sent">
                            <devtools-icon name="arrow-up-down" class="medium" style="color: var(--icon-request-response);">
                            </devtools-icon>
                          </td>`:g`
                          <td title="received">
                            <devtools-icon name="arrow-down" class="medium" style="color: var(--icon-request);">
                            </devtools-icon>
                          </td>`}
                        <td>${t.method}</td>
                        <td>${t.params?g`<code>${JSON.stringify(t.params)}</code>`:""}</td>
                        <td>
                          ${t.result?g`<code>${JSON.stringify(t.result)}</code>`:t.error?g`<code>${JSON.stringify(t.error)}</code>`:"id"in t?"(pending)":""}
                        </td>
                        <td data-value=${t.elapsedTime||0}>
                          ${"id"in t?t.elapsedTime?d(i.sMs,{PH1:String(t.elapsedTime)}):"(pending)":""}
                        </td>
                        <td data-value=${t.requestTime}>${d(i.sMs,{PH1:String(t.requestTime)})}</td>
                        <td>${Be(t.target)}</td>
                        <td>${t.sessionId||""}</td>
                      </tr>`)}
                  </table>
              </devtools-data-grid>
              <devtools-widget ${M(F,{request:s.selectedMessage?.params,response:s.selectedMessage?.result||s.selectedMessage?.error,type:s.selectedMessage?"id"in s?.selectedMessage?"sent":"received":void 0})}
                  class="protocol-monitor-info"
                  slot="sidebar"></devtools-widget>
            </devtools-split-view>
            <devtools-toolbar class="protocol-monitor-bottom-toolbar"
               jslog=${C.toolbar("bottom")}>
              <devtools-button .title=${s.sidebarVisible?d(i.hideCDPCommandEditor):d(i.showCDPCommandEditor)}
                               .iconName=${s.sidebarVisible?"left-panel-close":"left-panel-open"}
                               .variant=${"toolbar"}
                               .jslogContext=${"protocol-monitor.toggle-command-editor"}
                               @click=${()=>s.onToggleSidebar()}></devtools-button>
              </devtools-button>
              <devtools-toolbar-input id="command-input"
                                      style=${ae({"flex-grow":1,display:s.sidebarVisible?"none":"flex"})}
                                      value=${s.command}
                                      list="command-input-suggestions"
                                      placeholder=${d(i.sendRawCDPCommand)}
                                      title=${d(i.sendRawCDPCommandExplanation)}
                                      @change=${t=>s.onCommandChange(t.detail)}
                                      @submit=${t=>s.onCommandSubmitted(t.detail)}>
                <datalist id="command-input-suggestions">
                  ${s.commandSuggestions.map(t=>g`<option value=${t}></option>`)}
                </datalist>
              </devtools-toolbar-input>
              <select class="target-selector"
                      title=${d(i.selectTarget)}
                      style=${ae({display:s.sidebarVisible?"none":"flex"})}
                      jslog=${C.dropDown("target-selector").track({change:!0})}
                      @change=${t=>s.onTargetChange(t.target.value)}>
                ${s.targets.map(t=>g`
                  <option jslog=${C.item("target").track({click:!0})}
                          value=${t.id()} ?selected=${t.id()===s.selectedTargetId}>
                    ${t.name()} (${t.inspectedURL()})
                  </option>`)}
              </select>
            </devtools-toolbar>
          </div>
          <devtools-widget slot="sidebar"
              ${M(P,{metadataByCommand:pe,typesByName:Ee,enumsByName:Re})}
              ${Me(P,t=>{e.editorWidget=t})}>
          </devtools-widget>
        </devtools-split-view>`,o)},W=class extends v.Panel.Panel{started;startTime;messageForId=new Map;filterParser;#t=["method","request","response","target","session"];#e=new O;#a;#i="";#s=!1;#l;#n=[];#o;#c="";#r;#d=new Map;constructor(e=ue){super("protocol-monitor",!0),this.#l=e,this.started=!1,this.startTime=0,this.#t=["method","request","response","type","target","session"],this.filterParser=new le.TextUtils.FilterParser(this.#t),this.#a="main",this.performUpdate(),this.#r.addEventListener("submiteditor",o=>{this.onCommandSend(o.data.command,o.data.parameters,o.data.targetId)}),j.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged",()=>{this.requestUpdate()}),j.TargetManager.TargetManager.instance().observeTargets(this)}targetAdded(e){this.#d.set(e.sessionId,e)}targetRemoved(e){this.#d.delete(e.sessionId)}#u(){let e=this.#r.getCommandJson(),o=this.#r.targetId;o&&(this.#a=o),e&&(this.#i=e,this.requestUpdate())}performUpdate(){let e={messages:this.#n,selectedMessage:this.#o,sidebarVisible:this.#s,command:this.#i,commandSuggestions:this.#e.allSuggestions(),filterKeys:this.#t,filter:this.#c,parseFilter:this.filterParser.parse.bind(this.filterParser),onSplitChange:a=>{if(a)this.#u(),this.#s=!1;else{let{command:r,parameters:n}=_(this.#i);this.#r.displayCommand(r,n,this.#a),this.#s=!0}this.requestUpdate()},onRecord:a=>{this.setRecording(a)},onClear:()=>{this.#n=[],this.messageForId.clear(),this.requestUpdate()},onSave:()=>{this.saveAsFile()},onSelect:a=>{this.#o=a,this.requestUpdate()},onContextMenu:this.#g.bind(this),onCommandChange:a=>{this.#i=a},onCommandSubmitted:a=>{this.#e.addEntry(a);let{command:r,parameters:n}=_(a);this.onCommandSend(r,n,this.#a)},onFilterChanged:a=>{this.#c=a,this.requestUpdate()},onTargetChange:a=>{this.#a=a},onToggleSidebar:()=>{this.#s=!this.#s,this.requestUpdate()},targets:j.TargetManager.TargetManager.instance().targets(),selectedTargetId:this.#a},o=this,t={set editorWidget(a){o.#r=a}};this.#l(e,t,this.contentElement)}#g(e,o){o.editSection().appendItem(d(i.editAndResend),()=>{if(!this.#o)return;let t=this.#o.params,a=this.#o.target?.id()||"",r=e.method;this.#i=JSON.stringify({command:r,parameters:t}),this.#s?this.#r.displayCommand(r,t,a):(this.#s=!0,this.requestUpdate())},{jslogContext:"edit-and-resend",disabled:!("id"in e)}),o.editSection().appendItem(d(i.filter),()=>{this.#c=`method:${e.method}`,this.requestUpdate()},{jslogContext:"filter"}),o.footerSection().appendItem(d(i.documentation),()=>{let[t,a]=e.method.split("."),r="id"in e?"method":"event";ne.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(`https://chromedevtools.github.io/devtools-protocol/tot/${t}#${r}-${a}`)},{jslogContext:"documentation"})}onCommandSend(e,o,t){let a=N.InspectorBackend.test,r=j.TargetManager.TargetManager.instance(),n=t?r.targetById(t):null,l=n?n.sessionId:"";a.sendRawMessage(e,o,()=>{},l)}wasShown(){super.wasShown(),!this.started&&(this.started=!0,this.startTime=Date.now(),this.setRecording(!0))}setRecording(e){let o=N.InspectorBackend.test;e?(o.onMessageSent=this.messageSent.bind(this),o.onMessageReceived=this.messageReceived.bind(this)):(o.onMessageSent=null,o.onMessageReceived=null)}messageReceived(e){if("id"in e&&e.id){let t=this.messageForId.get(e.id);if(!t)return;t.result=e.result,t.error=e.error,t.elapsedTime=Date.now()-this.startTime-t.requestTime,this.messageForId.delete(e.id),this.requestUpdate();return}let o=e.sessionId!==void 0?this.#d.get(e.sessionId):void 0;this.#n.push({method:e.method,sessionId:e.sessionId,target:o,requestTime:Date.now()-this.startTime,result:e.params}),this.requestUpdate()}messageSent(e){let o=e.sessionId!==void 0?this.#d.get(e.sessionId):void 0,t={method:e.method,params:e.params,id:e.id,sessionId:e.sessionId,target:o,requestTime:Date.now()-this.startTime};this.#n.push(t),this.requestUpdate(),this.messageForId.set(e.id,t)}async saveAsFile(){let e=new Date,o="ProtocolMonitor-"+ie.DateUtilities.toISO8601Compact(e)+".json",t=new de.FileUtils.FileOutputStream;if(!await t.open(o))return;let r=this.#n.map(n=>({...n,target:n.target?.id()}));t.write(JSON.stringify(r,null,"  ")),t.close()}},O=class{#t=200;#e=new Set;constructor(e){e!==void 0&&(this.#t=e)}allSuggestions(){let e=[...this.#e].reverse();return e.push(...pe.keys()),e}buildTextPromptCompletions=async(e,o,t)=>!o&&!t&&e?[]:this.allSuggestions().filter(r=>r.startsWith(o)).map(r=>({text:r}));addEntry(e){if(this.#e.has(e)&&this.#e.delete(e),this.#e.add(e),this.#e.size>this.#t){let o=this.#e.values().next().value;this.#e.delete(o)}}},De=(s,e,o)=>{ce(g`
    <devtools-tabbed-pane>${s.type===void 0?g`
      <devtools-widget
          id="request" title=${d(i.request)}
          ?selected=${s.selectedTab==="request"} disabled
          ${M(v.EmptyWidget.EmptyWidget,{header:d(i.noMessageSelected),text:d(i.selectAMessageToView)})}>
      </devtools-widget>
      <devtools-widget
          id="response" title=${d(i.response)}
          ?selected=${s.selectedTab==="response"}
          ${M(v.EmptyWidget.EmptyWidget,{header:d(i.noMessageSelected),text:d(i.selectAMessageToView)})}>
      </devtools-widget>`:g`
      <devtools-widget
          id="request" title=${d(i.request)}
          ?selected=${s.selectedTab==="request"} ?disabled=${s.type!=="sent"}
          ${M(J.JSONView.SearchableJsonView,{jsonObject:s.request})}>
      </devtools-widget>
      <devtools-widget
          id="response" title=${d(i.response)}
          ?selected=${s.selectedTab==="response"}
          ${M(J.JSONView.SearchableJsonView,{jsonObject:s.response})}>
      </devtools-widget>`}
    </devtools-tabbed-pane>`,o)},F=class extends v.Widget.VBox{#t;request;response;type;constructor(e,o=De){super(e),this.#t=o,this.requestUpdate()}performUpdate(){this.#t({request:this.request,response:this.response,type:this.type,selectedTab:this.type!=="sent"?"response":void 0},void 0,this.contentElement)}};function _(s){let e=null;try{e=JSON.parse(s)}catch{}let o=e?e.command||e.method||e.cmd||"":s,t=e?.parameters||e?.params||e?.args||e?.arguments||{};return{command:o,parameters:t}}function Be(s){return s?s.decorateLabel(`${s.name()} ${s===j.TargetManager.TargetManager.instance().rootTarget()?"":s.id()}`):""}export{se as JSONEditor,ge as ProtocolMonitor};
//# sourceMappingURL=protocol_monitor.js.map
