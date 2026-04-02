var cs=Object.defineProperty;var j=(s,e)=>{for(var t in e)cs(s,t,{get:e[t],enumerable:!0})};var wt={};j(wt,{ControlButton:()=>X,DEFAULT_VIEW:()=>yt});import*as bt from"./../../../ui/legacy/legacy.js";import*as Be from"./../../../ui/lit/lit.js";var vt=`*{margin:0;padding:0;box-sizing:border-box;font-size:inherit}.control{background:none;border:none;display:flex;flex-direction:column;align-items:center}.control[disabled]{filter:grayscale(100%);cursor:auto}.icon{display:flex;width:40px;height:40px;border-radius:50%;background:var(--sys-color-error-bright);margin-bottom:8px;position:relative;transition:background 200ms;place-content:center center;align-items:center}.icon::before{--override-white:#fff;box-sizing:border-box;content:"";display:block;width:14px;height:14px;border:1px solid var(--override-white);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background-color:var(--override-white)}.icon.square::before{border-radius:0}.icon.circle::before{border-radius:50%}.icon:hover{background:color-mix(in srgb,var(--sys-color-error-bright),var(--sys-color-state-hover-on-prominent) 10%)}.icon:active{background:color-mix(in srgb,var(--sys-color-error-bright),var(--sys-color-state-ripple-neutral-on-prominent) 16%)}.control[disabled] .icon:hover{background:var(--sys-color-error)}.label{font-size:12px;line-height:16px;text-align:center;letter-spacing:0.02em;color:var(--sys-color-on-surface)}
/*# sourceURL=${import.meta.resolve("./controlButton.css")} */`;var{html:ds}=Be,yt=(s,e,t)=>{let{label:o,shape:i,disabled:r,onClick:n}=s;Be.render(ds`
    <style>${vt}</style>
    <button
        @click=${g=>{r?(g.stopPropagation(),g.preventDefault()):n(g)}}
        .disabled=${r}
        class="control">
      <div class="icon ${i}"></div>
      <div class="label">${o}</div>
    </button>
  `,t)},X=class extends bt.Widget.Widget{#t="";#e="square";#s=!1;#o=()=>{};#i;constructor(e,t){super(e,{useShadowDom:!0,classes:["flex-none"]}),this.#i=t||yt}set label(e){this.#t=e,this.requestUpdate()}set shape(e){this.#e=e,this.requestUpdate()}set disabled(e){this.#s=e,this.requestUpdate()}set onClick(e){this.#o=e,this.requestUpdate()}performUpdate(){this.#i({label:this.#t,shape:this.#e,disabled:this.#s,onClick:this.#o},{},this.contentElement)}};var $t={};j($t,{CreateRecordingView:()=>ze,DEFAULT_VIEW:()=>xt});import"./../../../ui/kit/kit.js";import*as Ke from"./../../../core/i18n/i18n.js";import*as we from"./../../../models/badges/badges.js";import"./../../../ui/components/buttons/buttons.js";import*as Se from"./../../../ui/components/input/input.js";import*as We from"./../../../ui/legacy/legacy.js";import*as He from"./../../../ui/lit/lit.js";import*as D from"./../../../ui/visual_logging/visual_logging.js";import*as L from"./../models/models.js";var St=`*{margin:0;padding:0;outline:none;box-sizing:border-box;font-size:inherit}.wrapper{padding:24px;flex:1}h1{font-size:18px;line-height:24px;letter-spacing:0.02em;color:var(--sys-color-on-surface);margin:0;font-weight:normal}.row-label{font-weight:500;font-size:11px;line-height:16px;letter-spacing:0.8px;text-transform:uppercase;color:var(--sys-color-secondary);margin-bottom:8px;margin-top:32px;display:flex;align-items:center;gap:3px}.footer{display:flex;justify-content:center;border-top:1px solid var(--sys-color-divider);padding:12px;background:var(--sys-color-cdt-base-container)}.controls{display:flex}.error{margin:16px 0 0;padding:8px;background:var(--sys-color-error-container);color:var(--sys-color-error)}.row-label .link:focus-visible{outline:var(--sys-color-state-focus-ring) auto 1px}.header-wrapper{display:flex;align-items:baseline;justify-content:space-between}.checkbox-label{display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis;gap:4px;line-height:1.1;padding:4px}.checkbox-container{display:flex;flex-flow:row wrap;gap:10px}input[type="checkbox"]:focus-visible{outline:var(--sys-color-state-focus-ring) auto 1px}devtools-icon[name="help"]{width:16px;height:16px}
/*# sourceURL=${import.meta.resolve("./createRecordingView.css")} */`;var{html:qe,Directives:{ref:ps,createRef:us,repeat:hs}}=He,k={recordingName:"Recording name",startRecording:"Start recording",createRecording:"Create a new recording",recordingNameIsRequired:"Recording name is required",selectorAttribute:"Selector attribute",cancelRecording:"Cancel recording",selectorTypeCSS:"CSS",selectorTypePierce:"Pierce",selectorTypeARIA:"ARIA",selectorTypeText:"Text",selectorTypeXPath:"XPath",selectorTypes:"Selector types to record",includeNecessarySelectors:"You must choose CSS, Pierce, or XPath as one of your options. Only these selectors are guaranteed to be recorded since ARIA and text selectors may not be unique.",learnMore:"Learn more"},gs=Ke.i18n.registerUIStrings("panels/recorder/components/CreateRecordingView.ts",k),C=Ke.i18n.getLocalizedString.bind(void 0,gs),{widget:ms}=We.Widget,xt=(s,e,t)=>{let{name:o,selectorAttribute:i,selectorTypes:r,error:n,onUpdate:a,onRecordingStarted:g,onRecordingCancelled:I,onErrorReset:y}=s,v=us(),S=b=>{n&&y(),b.key==="Enter"&&(g(),b.stopPropagation(),b.preventDefault())};e.focusInput=()=>{v.value?.focus()};let R=new Map([[L.Schema.SelectorType.ARIA,C(k.selectorTypeARIA)],[L.Schema.SelectorType.CSS,C(k.selectorTypeCSS)],[L.Schema.SelectorType.Text,C(k.selectorTypeText)],[L.Schema.SelectorType.XPath,C(k.selectorTypeXPath)],[L.Schema.SelectorType.Pierce,C(k.selectorTypePierce)]]);He.render(qe`
      <style>${St}</style>
      <style>${Se.textInputStyles}</style>
      <style>${Se.checkboxStyles}</style>
      <div class="wrapper" jslog=${D.section("create-recording-view")}>
        <div class="header-wrapper">
          <h1>${C(k.createRecording)}</h1>
          <devtools-button
            title=${C(k.cancelRecording)}
            jslog=${D.close().track({click:!0})}
            .data=${{variant:"icon",size:"SMALL",iconName:"cross"}}
            @click=${I}
          ></devtools-button>
        </div>
        <label class="row-label" for="user-flow-name">${C(k.recordingName)}</label>
        <input
          value=${o}
          @focus=${()=>v.value?.select()}
          @keydown=${S}
          jslog=${D.textField("user-flow-name").track({change:!0})}
          class="devtools-text-input"
          id="user-flow-name"
          ${ps(v)}
          @input=${b=>a({name:b.target.value.trim()})}
        />
        <label class="row-label" for="selector-attribute">
          <span>${C(k.selectorAttribute)}</span>
          <devtools-link
            class="link" href="https://g.co/devtools/recorder#selector"
            title=${C(k.learnMore)}
            .jslogContext=${"recorder-selector-help"}>
            <devtools-icon name="help">
            </devtools-icon>
          </devtools-link>
        </label>
        <input
          value=${i}
          placeholder="data-testid"
          @keydown=${S}
          jslog=${D.textField("selector-attribute").track({change:!0})}
          class="devtools-text-input"
          id="selector-attribute"
          @input=${b=>a({selectorAttribute:b.target.value.trim()})}
        />
        <label class="row-label">
          <span>${C(k.selectorTypes)}</span>
          <devtools-link
            class="link" href="https://g.co/devtools/recorder#selector"
            title=${C(k.learnMore)}
            .jslogContext=${"recorder-selector-help"}>
            <devtools-icon name="help">
            </devtools-icon>
          </devtools-link>
        </label>
        <div class="checkbox-container">
          ${hs(r,b=>qe`
              <label class="checkbox-label selector-type">
                <input
                  @keydown=${S}
                  .value=${b.selectorType}
                  jslog=${D.toggle().track({click:!0}).context(`selector-${b.selectorType}`)}
                  ?checked=${b.checked}
                  type="checkbox"
                  @change=${_=>a({selectorType:b.selectorType,checked:_.target.checked})}
                />
                ${R.get(b.selectorType)||b.selectorType}
              </label>
            `)}
        </div>
        ${n&&qe` <div class="error" role="alert"> ${n.message} </div>`}
      </div>
      <div class="footer">
        <div class="controls">
          <devtools-widget
            class="control-button"
            ${ms(X,{label:C(k.startRecording),shape:"circle",onClick:g})}
            jslog=${D.action("chrome-recorder.start-recording").track({click:!0})}
            title=${L.Tooltip.getTooltipForActions(C(k.startRecording),"chrome-recorder.start-recording")}
          ></devtools-widget>
        </div>
      </div>
    `,t)},ze=class extends We.Widget.Widget{#t;#e="";#s="";#o=[];#i;#a={};#n;onRecordingStarted=()=>{};onRecordingCancelled=()=>{};set recorderSettings(e){this.#n=e,this.#e=this.#n.defaultTitle,this.#s=this.#n.selectorAttribute,this.#o=Object.values(L.Schema.SelectorType).map(t=>({selectorType:t,checked:this.#n?.getSelectorByType(t)??!0})),this.requestUpdate()}constructor(e,t){super(e,{useShadowDom:!0}),this.#i=t||xt}wasShown(){super.wasShown(),this.requestUpdate(),this.updateComplete.then(()=>this.#a.focusInput?.())}startRecording(){if(!this.#n)throw new Error("settings not set");if(!this.#e.trim()){this.#t=new Error(C(k.recordingNameIsRequired)),this.requestUpdate();return}let e=this.#o.filter(o=>o.checked).map(o=>o.selectorType);if(!e.includes(L.Schema.SelectorType.CSS)&&!e.includes(L.Schema.SelectorType.XPath)&&!e.includes(L.Schema.SelectorType.Pierce)){this.#t=new Error(C(k.includeNecessarySelectors)),this.requestUpdate();return}for(let o of Object.values(L.Schema.SelectorType))this.#n.setSelectorByType(o,e.includes(o));let t=this.#s.trim();t&&(this.#n.selectorAttribute=t),this.onRecordingStarted({name:this.#e,selectorTypesToRecord:e,selectorAttribute:this.#s?this.#s:void 0}),we.UserBadges.instance().recordAction(we.BadgeAction.RECORDER_RECORDING_STARTED)}performUpdate(){this.#i({name:this.#e,selectorAttribute:this.#s,selectorTypes:this.#o,error:this.#t,onRecordingCancelled:this.onRecordingCancelled,onUpdate:e=>{"name"in e?this.#e=e.name:"selectorAttribute"in e?this.#s=e.selectorAttribute:this.#o=this.#o.map(t=>t.selectorType===e.selectorType?{...t,checked:e.checked}:t),this.requestUpdate()},onRecordingStarted:()=>{this.startRecording()},onErrorReset:()=>{this.#t=void 0,this.requestUpdate()}},this.#a,this.contentElement)}};var Rt={};j(Rt,{CreateRecordingEvent:()=>xe,DEFAULT_VIEW:()=>It,DeleteRecordingEvent:()=>$e,OpenRecordingEvent:()=>ke,PlayRecordingEvent:()=>Ee,RecordingListView:()=>_e});import"./../../../ui/kit/kit.js";import*as Xe from"./../../../core/i18n/i18n.js";import"./../../../ui/components/buttons/buttons.js";import*as Et from"./../../../ui/legacy/legacy.js";import*as Ye from"./../../../ui/lit/lit.js";import*as Ct from"./../../../ui/visual_logging/visual_logging.js";import*as Tt from"./../models/models.js";var kt=`@scope to (devtools-widget > *){*{margin:0;padding:0;box-sizing:border-box;font-size:inherit}*:focus,
  *:focus-visible{outline:none}.wrapper{padding:24px}.header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}h1{font-size:16px;line-height:19px;color:var(--sys-color-on-surface);font-weight:normal}.icon,
  .icon devtools-icon{width:20px;height:20px;color:var(--sys-color-primary)}.table{margin-top:35px}.title{font-size:13px;color:var(--sys-color-on-surface);margin-left:10px;flex:1;overflow-x:hidden;white-space:nowrap;text-overflow:ellipsis}.row{display:flex;align-items:center;padding-right:5px;height:28px;border-bottom:1px solid var(--sys-color-divider)}.row:focus-within,
  .row:hover{background-color:var(--sys-color-state-hover-on-subtle)}.row:last-child{border-bottom:none}.actions{display:flex;align-items:center}.actions button{border:none;background-color:transparent;width:24px;height:24px;border-radius:50%}.actions .divider{width:1px;height:17px;background-color:var(--sys-color-divider);margin:0 6px}}
/*# sourceURL=${import.meta.resolve("./recordingListView.css")} */`;var{html:Ge}=Ye,Y={savedRecordings:"Saved recordings",createRecording:"Create a new recording",playRecording:"Play recording",deleteRecording:"Delete recording",openRecording:"Open recording"},fs=Xe.i18n.registerUIStrings("panels/recorder/components/RecordingListView.ts",Y),ee=Xe.i18n.getLocalizedString.bind(void 0,fs),xe=class s extends Event{static eventName="createrecording";constructor(){super(s.eventName,{composed:!0,bubbles:!0})}},$e=class s extends Event{storageName;static eventName="deleterecording";constructor(e){super(s.eventName,{composed:!0,bubbles:!0}),this.storageName=e}},ke=class s extends Event{storageName;static eventName="openrecording";constructor(e){super(s.eventName,{composed:!0,bubbles:!0}),this.storageName=e}},Ee=class s extends Event{storageName;static eventName="playrecording";constructor(e){super(s.eventName,{composed:!0,bubbles:!0}),this.storageName=e}},It=(s,e,t)=>{let{recordings:o,replayAllowed:i,onCreateClick:r,onDeleteClick:n,onOpenClick:a,onPlayRecordingClick:g,onKeyDown:I}=s;Ye.render(Ge`
      <style>${kt}</style>
      <div class="wrapper">
        <div class="header">
          <h1>${ee(Y.savedRecordings)}</h1>
          <devtools-button
            .variant=${"primary"}
            @click=${r}
            title=${Tt.Tooltip.getTooltipForActions(ee(Y.createRecording),"chrome-recorder.create-recording")}
            .jslogContext=${"create-recording"}
          >
            ${ee(Y.createRecording)}
          </devtools-button>
        </div>
        <div class="table">
          ${o.map(y=>Ge`
                <div
                  role="button"
                  tabindex="0"
                  aria-label=${ee(Y.openRecording)}
                  class="row"
                  @keydown=${v=>I(y.storageName,v)}
                  @click=${v=>a(y.storageName,v)}
                  jslog=${Ct.item().track({click:!0,resize:!0}).context("recording")}>
                  <div class="icon">
                    <devtools-icon name="flow">
                    </devtools-icon>
                  </div>
                  <div class="title">${y.name}</div>
                  <div class="actions">
                    ${i?Ge`
                              <devtools-button
                                title=${ee(Y.playRecording)}
                                .data=${{variant:"icon",iconName:"play",jslogContext:"play-recording"}}
                                @click=${v=>g(y.storageName,v)}
                                @keydown=${v=>v.stopPropagation()}
                              ></devtools-button>
                              <div class="divider"></div>`:""}
                    <devtools-button
                      class="delete-recording-button"
                      title=${ee(Y.deleteRecording)}
                      .data=${{variant:"icon",iconName:"bin",jslogContext:"delete-recording"}}
                      @click=${v=>n(y.storageName,v)}
                      @keydown=${v=>v.stopPropagation()}
                    ></devtools-button>
                  </div>
                </div>
              `)}
        </div>
      </div>
    `,t)},_e=class extends Et.Widget.Widget{#t=[];#e=!0;#s;constructor(e,t){super(e,{useShadowDom:!0}),this.#s=t||It}set recordings(e){this.#t=e,this.performUpdate()}set replayAllowed(e){this.#e=e,this.performUpdate()}#o(){this.contentElement.dispatchEvent(new xe)}#i(e,t){t.stopPropagation(),this.contentElement.dispatchEvent(new $e(e))}#a(e,t){t.stopPropagation(),this.contentElement.dispatchEvent(new ke(e))}#n(e,t){t.stopPropagation(),this.contentElement.dispatchEvent(new Ee(e))}#l(e,t){t.key==="Enter"&&this.#a(e,t)}performUpdate(){this.#s({recordings:this.#t,replayAllowed:this.#e,onCreateClick:this.#o.bind(this),onDeleteClick:this.#i.bind(this),onOpenClick:this.#a.bind(this),onPlayRecordingClick:this.#n.bind(this),onKeyDown:this.#l.bind(this)},{},this.contentElement)}wasShown(){super.wasShown(),this.performUpdate()}};var ls={};j(ls,{DEFAULT_VIEW:()=>as,RecordingView:()=>gt});import"./../../../ui/kit/kit.js";import"./../../../ui/legacy/legacy.js";import"./../../../ui/kit/kit.js";import*as et from"./../../../core/i18n/i18n.js";import"./../../../ui/components/buttons/buttons.js";import*as tt from"./../../../ui/lit/lit.js";import*as Te from"./../../../ui/visual_logging/visual_logging.js";import*as Ce from"./../extensions/extensions.js";var Lt=`*{margin:0;padding:0;outline:none;box-sizing:border-box;font-size:inherit}.extension-view{display:flex;flex-direction:column;height:100%}main{flex:1}iframe{border:none;height:100%;width:100%}header{display:flex;padding:3px 8px;justify-content:space-between;border-bottom:1px solid var(--sys-color-divider)}header > div{align-self:center}.icon{display:block;width:16px;height:16px;color:var(--sys-color-secondary)}.title{display:flex;flex-direction:row;gap:6px;color:var(--sys-color-secondary);align-items:center;font-weight:500}
/*# sourceURL=${import.meta.resolve("./extensionView.css")} */`;var{html:vs}=tt,Je={closeView:"Close",extension:"Content provided by a browser extension"},bs=et.i18n.registerUIStrings("panels/recorder/components/ExtensionView.ts",Je),Mt=et.i18n.getLocalizedString.bind(void 0,bs),Ze=class s extends Event{static eventName="recorderextensionviewclosed";constructor(){super(s.eventName,{bubbles:!0,composed:!0})}},Qe=class extends HTMLElement{#t=this.attachShadow({mode:"open"});#e;constructor(){super(),this.setAttribute("jslog",`${Te.section("extension-view")}`)}connectedCallback(){this.#o()}disconnectedCallback(){this.#e&&Ce.ExtensionManager.ExtensionManager.instance().getView(this.#e.id).hide()}set descriptor(e){this.#e=e,this.#o(),Ce.ExtensionManager.ExtensionManager.instance().getView(e.id).show()}#s(){this.dispatchEvent(new Ze)}#o(){if(!this.#e)return;let e=Ce.ExtensionManager.ExtensionManager.instance().getView(this.#e.id).frame();tt.render(vs`
        <style>${Lt}</style>
        <div class="extension-view">
          <header>
            <div class="title">
              <devtools-icon
                class="icon"
                title=${Mt(Je.extension)}
                name="extension">
              </devtools-icon>
              ${this.#e.title}
            </div>
            <devtools-button
              title=${Mt(Je.closeView)}
              jslog=${Te.close().track({click:!0})}
              .data=${{variant:"icon",size:"SMALL",iconName:"cross"}}
              @click=${this.#s}
            ></devtools-button>
          </header>
          <main>
            ${e}
          </main>
      </div>
    `,this.#t,{host:this})}};customElements.define("devtools-recorder-extension-view",Qe);import*as je from"./../../../core/host/host.js";import*as ne from"./../../../core/i18n/i18n.js";import*as mt from"./../../../core/platform/platform.js";import*as V from"./../../../core/sdk/sdk.js";import*as ae from"./../../../third_party/codemirror.next/codemirror.next.js";import"./../../../ui/components/buttons/buttons.js";import*as rs from"./../../../ui/components/code_highlighter/code_highlighter.js";import"./../../../ui/components/dialogs/dialogs.js";import*as ns from"./../../../ui/components/input/input.js";import*as Fe from"./../../../ui/components/text_editor/text_editor.js";import*as G from"./../../../ui/legacy/legacy.js";import*as $ from"./../../../ui/lit/lit.js";import*as h from"./../../../ui/visual_logging/visual_logging.js";import*as O from"./../models/models.js";var Ut=`@scope to (devtools-widget > *){*{padding:0;margin:0;box-sizing:border-box;font-size:inherit}.wrapper{display:flex;flex-direction:row;flex:1;height:100%}.main{overflow:hidden;display:flex;flex-direction:column;flex:1}.sections{min-height:0;background-color:var(--sys-color-cdt-base-container);z-index:0;position:relative;container:sections/inline-size}.section{display:flex;padding:0 16px;gap:8px;position:relative}.section::after{content:'';border-bottom:1px solid var(--sys-color-divider);position:absolute;left:0;right:0;bottom:0;z-index:-1}.section:last-child::after{content:none}.screenshot-wrapper{flex:0 0 80px;padding-top:32px;z-index:2}@container sections (max-width: 400px){.screenshot-wrapper{display:none}}.screenshot{object-fit:cover;object-position:top center;max-width:100%;width:200px;height:auto;border:1px solid var(--sys-color-divider);border-radius:1px}.content{flex:1;min-width:0}.steps{flex:1;position:relative;align-self:flex-start;overflow:visible}.step{position:relative;padding-left:40px;margin:16px 0}.step .action{font-size:13px;line-height:16px;letter-spacing:0.03em}.recording{color:var(--sys-color-primary);font-style:italic;margin-top:8px;margin-bottom:0}.add-assertion-button{margin-top:8px}.details{max-width:240px;display:flex;flex-direction:column;align-items:flex-end}.url{font-size:12px;line-height:16px;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--sys-color-secondary);max-width:100%;margin-bottom:16px}.header{flex-shrink:0;align-items:center;border-bottom:1px solid var(--sys-color-divider);display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;padding:16px}.header-title-wrapper{max-width:100%}.header-title{align-items:center;display:flex;flex:1;max-width:100%}.header-title::before{content:'';min-width:12px;height:12px;display:inline-block;background:var(--sys-color-primary);border-radius:50%;margin-right:7px}#title-input{font-family:inherit;field-sizing:content;font-size:18px;line-height:22px;letter-spacing:0.02em;padding:1px 4px;border:1px solid transparent;border-radius:1px;word-break:break-all}#title-input:hover,
  #title-input:focus-visible{border-color:var(--input-outline)}#title-input.has-error{border-color:var(--sys-color-error)}#title-input.disabled{color:var(--sys-color-state-disabled)}.title-input-error-text{margin-top:4px;margin-left:19px;color:var(--sys-color-error)}.title-button-bar{flex-shrink:0;padding-left:2px;display:flex}#title-input:focus + .title-button-bar{display:none}.settings-row{padding:16px 28px;border-bottom:1px solid var(--sys-color-divider);display:flex;flex-flow:row wrap;justify-content:space-between}.settings-title{font-size:14px;line-height:24px;letter-spacing:0.03em;color:var(--sys-color-on-surface);display:flex;align-items:center;align-content:center;gap:5px;width:fit-content}.settings-title:focus-visible{outline:2px solid var(--sys-color-state-focus-ring);outline-offset:2px}.settings{margin-top:4px;display:flex;flex-wrap:wrap;font-size:12px;line-height:20px;letter-spacing:0.03em;color:var(--sys-color-on-surface-subtle)}.settings.expanded{gap:10px}.settings .separator{width:1px;height:20px;background-color:var(--sys-color-divider);margin:0 5px}.actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.actions .separator{width:1px;height:24px;background-color:var(--sys-color-divider)}.is-recording .header-title::before{background:var(--sys-color-error-bright)}.footer{display:flex;justify-content:center;border-top:1px solid var(--sys-color-divider);padding:12px;background:var(--sys-color-cdt-base-container);z-index:1}.controls{align-items:center;display:flex;justify-content:center;position:relative;width:100%}.chevron{width:14px;height:14px;transform:rotate(-90deg);color:var(--sys-color-on-surface)}.expanded .chevron{transform:rotate(0)}.editable-setting{display:flex;flex-direction:row;gap:12px;align-items:center}.editable-setting .devtools-text-input{width:fit-content;height:var(--sys-size-9)}.wrapping-label{display:inline-flex;align-items:center;gap:12px}.text-editor{height:100%;overflow:auto}.section-toolbar{display:flex;align-items:center;padding:3px 5px;justify-content:space-between;gap:3px}.section-toolbar > devtools-select-menu{height:24px;min-width:50px}.sections .section-toolbar{justify-content:flex-end}devtools-split-view{flex:1 1 0%;min-height:0}[slot='main']{overflow:hidden auto}[slot='sidebar']{display:flex;flex-direction:column;overflow:auto;height:100%;width:100%}[slot='sidebar'] .section-toolbar{border-bottom:1px solid var(--sys-color-divider)}devtools-recorder-extension-view{flex:1}}
/*# sourceURL=${import.meta.resolve("./recordingView.css")} */`;var Ot={};j(Ot,{DEFAULT_VIEW:()=>Vt,ReplaySection:()=>le});import*as st from"./../../../core/i18n/i18n.js";import*as Dt from"./../../../core/platform/platform.js";import"./../../../ui/components/buttons/buttons.js";import*as Le from"./../../../ui/legacy/legacy.js";import*as ce from"./../../../ui/lit/lit.js";import*as te from"./../../../ui/visual_logging/visual_logging.js";import*as Pt from"./../models/models.js";var Nt=`.select-button{display:flex;gap:var(--sys-size-6)}.groups-label{display:inline-block;padding:0 var(--sys-size-4) var(--sys-size-4) 0}.select-button devtools-button{position:relative}
/*# sourceURL=${import.meta.resolve("./replaySection.css")} */`;var{html:Ie,Directives:{ifDefined:ys,repeat:At}}=ce,U={Replay:"Replay",ReplayNormalButtonLabel:"Normal speed",ReplayNormalItemLabel:"Normal (Default)",ReplaySlowButtonLabel:"Slow speed",ReplaySlowItemLabel:"Slow",ReplayVerySlowButtonLabel:"Very slow speed",ReplayVerySlowItemLabel:"Very slow",ReplayExtremelySlowButtonLabel:"Extremely slow speed",ReplayExtremelySlowItemLabel:"Extremely slow",speedGroup:"Speed",extensionGroup:"Extensions"},ws=st.i18n.registerUIStrings("panels/recorder/components/ReplaySection.ts",U),P=st.i18n.getLocalizedString.bind(void 0,ws),Re="extension",Vt=(s,e,t)=>{let{disabled:o,groups:i,selectedItem:r,actionTitle:n,onButtonClick:a,onItemSelected:g}=s,I="primary",y=S=>{S.stopPropagation(),a()},v=S=>{S.target instanceof HTMLSelectElement&&g(S.target.value)};ce.render(Ie`
      <style>
        ${Le.inspectorCommonStyles}
      </style>
      <style>
        ${Nt}
      </style>
      <div
        class="select-button"
        title=${ys(n)}
      >
        <label>
          ${i.length>1?Ie`
                <div
                  class="groups-label"
                  >${i.map(S=>S.name).join(" & ")}</div>`:ce.nothing}
          <select
            class="primary"
            ?disabled=${o}
            jslog=${te.dropDown("network-conditions").track({change:!0})}
            @change=${v}
          >
            ${At(i,S=>S.name,S=>Ie`
                <optgroup label=${S.name}>
                  ${At(S.items,R=>R.value,R=>{let b=R.value===r.value;return Ie`
                      <option
                        .title=${R.label()}
                        value=${R.value}
                        ?selected=${b}
                        jslog=${te.item(Dt.StringUtilities.toKebabCase(R.value)).track({click:!0})}
                      >
                        ${b&&R.buttonLabel?R.buttonLabel():R.label()}
                      </option>
                    `})}
                </optgroup>
              `)}
          </select>
        </label>
        <devtools-button
          .disabled=${o}
          .variant=${I}
          .iconName=${r.buttonIconName}
          @click=${y}
          jslog=${te.action("chrome-recorder.replay-recording").track({click:!0})}
        >
          ${P(U.Replay)}
        </devtools-button>
      </div>`,t)},le=class extends Le.Widget.Widget{onStartReplay;#t=!1;#e;#s=[];#o;#i=[];constructor(e,t){super(e,{useShadowDom:!0}),this.#o=t||Vt,this.#i=this.#a()}set settings(e){this.#e=e,this.performUpdate()}set replayExtensions(e){this.#s=e,this.#i=this.#a(),this.performUpdate()}get disabled(){return this.#t}set disabled(e){this.#t=e,this.performUpdate()}wasShown(){super.wasShown(),this.performUpdate()}performUpdate(){let e=this.#n();this.#o({disabled:this.#t,groups:this.#i,selectedItem:e,actionTitle:Pt.Tooltip.getTooltipForActions(e.label(),"chrome-recorder.replay-recording"),onButtonClick:()=>this.#l(),onItemSelected:t=>this.#d(t)},void 0,this.contentElement)}#a(){let e=[{name:P(U.speedGroup),items:[{value:"normal",buttonIconName:"play",buttonLabel:()=>P(U.ReplayNormalButtonLabel),label:()=>P(U.ReplayNormalItemLabel)},{value:"slow",buttonIconName:"play",buttonLabel:()=>P(U.ReplaySlowButtonLabel),label:()=>P(U.ReplaySlowItemLabel)},{value:"very_slow",buttonIconName:"play",buttonLabel:()=>P(U.ReplayVerySlowButtonLabel),label:()=>P(U.ReplayVerySlowItemLabel)},{value:"extremely_slow",buttonIconName:"play",buttonLabel:()=>P(U.ReplayExtremelySlowButtonLabel),label:()=>P(U.ReplayExtremelySlowItemLabel)}]}];return this.#s.length&&e.push({name:P(U.extensionGroup),items:this.#s.map((t,o)=>({value:Re+o,buttonIconName:"play",buttonLabel:()=>t.getName(),label:()=>t.getName()}))}),e}#n(){let e=this.#e?.replayExtension||this.#e?.speed||"";for(let t of this.#i)for(let o of t.items)if(o.value===e)return o;return this.#i[0].items[0]}#l(){let e=this.#e?.replayExtension||this.#e?.speed||"";if(e?.startsWith(Re)){let t=Number(e.substring(Re.length)),o=this.#s[t];this.#e&&(this.#e.replayExtension=Re+t),this.onStartReplay&&this.onStartReplay("normal",o)}else this.onStartReplay&&this.onStartReplay(this.#e?this.#e.speed:"normal");this.performUpdate()}#d(e){let t=e;this.#e&&t&&(this.#e.speed=t,this.#e.replayExtension=""),this.performUpdate()}};var is={};j(is,{AddBreakpointEvent:()=>fe,AddStep:()=>me,CaptureSelectorsEvent:()=>pt,CopyStepEvent:()=>De,DEFAULT_VIEW:()=>os,RemoveBreakpointEvent:()=>ve,RemoveStep:()=>Ve,StepChanged:()=>Pe,StepView:()=>re});import"./../../../ui/kit/kit.js";var Jt={};j(Jt,{EditorState:()=>J,StepEditedEvent:()=>Ne,StepEditor:()=>Z});import*as ct from"./../../../core/i18n/i18n.js";import*as at from"./../../../core/platform/platform.js";import"./../../../ui/components/buttons/buttons.js";import*as Ue from"./../../../ui/components/suggestion_input/suggestion_input.js";import*as Gt from"./../../../ui/legacy/legacy.js";import*as ks from"./../../../ui/lit/lit.js";import*as w from"./../../../ui/visual_logging/visual_logging.js";import*as m from"./../models/models.js";import*as _t from"./../util/util.js";var Kt={};j(Kt,{DEFAULT_VIEW:()=>zt,RequestSelectorAttributeEvent:()=>de,SelectorPicker:()=>pe});import*as it from"./../../../core/common/common.js";import*as rt from"./../../../core/i18n/i18n.js";import*as Me from"./../../../core/platform/platform.js";import*as N from"./../../../core/sdk/sdk.js";import"./../../../ui/components/buttons/buttons.js";import*as Ft from"./../../../ui/legacy/legacy.js";import*as nt from"./../../../ui/lit/lit.js";import*as Bt from"./../../../ui/visual_logging/visual_logging.js";import*as se from"./../models/models.js";import*as F from"./../util/util.js";var jt=`:host{display:inline-block}.selector-picker{width:18px;height:18px}
/*# sourceURL=${import.meta.resolve("./selectorPicker.css")} */`;var{html:Ss}=nt,ot="captureSelectors",de=class s extends Event{static eventName="requestselectorattribute";send;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.send=e}},qt={selectorPicker:"Select an element in the page to update selectors"},xs=rt.i18n.registerUIStrings("panels/recorder/components/SelectorPicker.ts",qt),$s=rt.i18n.getLocalizedString.bind(void 0,xs),zt=(s,e,t)=>{let{active:o,disabled:i,onClick:r}=s;nt.render(Ss`
      <style>${jt}</style>
      <devtools-button
        @click=${r}
        .title=${$s(qt.selectorPicker)}
        class="selector-picker"
        .size=${"SMALL"}
        .iconName=${"select-element"}
        .active=${o}
        .disabled=${i}
        .variant=${"icon"}
        jslog=${Bt.toggle("selector-picker").track({click:!0})}
      ></devtools-button>
    `,t)},pe=class s extends Ft.Widget.Widget{#t;#e=!1;#s=!1;#o;#i=new it.Mutex.Mutex;#a=new Map;#n=new Map;onSelectorPicked;onAttributeRequested;constructor(e,t){super(e,{useShadowDom:!0}),this.#t=t||zt}static get#l(){return N.TargetManager.TargetManager.instance()}set disabled(e){this.#e=e,this.requestUpdate()}performUpdate(){this.#t({active:this.#s,disabled:this.#e,onClick:this.#d.bind(this)},{},this.contentElement)}#d(e){e.preventDefault(),e.stopPropagation(),this.#c()}async#c(){return this.#s?await this.#u():await this.#p()}#p=()=>this.#i.run(async()=>{this.#s||(this.#s=!0,this.#o=await new Promise((e,t)=>{let o=setTimeout(t,1e3);this.onAttributeRequested?this.onAttributeRequested(i=>{clearTimeout(o),e(i)}):(clearTimeout(o),e(void 0))}),s.#l.observeTargets(this),this.requestUpdate())});#u=()=>this.#i.run(async()=>{this.#s&&(this.#s=!1,s.#l.unobserveTargets(this),s.#l.targets().map(this.targetRemoved.bind(this)),this.#o=void 0,this.requestUpdate())});targetAdded(e){if(e.type()!==N.Target.Type.FRAME)return;let t=this.#a.get(e);t||(t=new it.Mutex.Mutex,this.#a.set(e,t)),t.run(async()=>{await this.#m(e),await this.#h(e)})}targetRemoved(e){let t=this.#a.get(e);t&&t.run(async()=>{try{await this.#g(e),await this.#f(e)}catch{}})}#r=e=>{if(e.data.name!==ot)return;let t=e.data.executionContextId,o=N.TargetManager.TargetManager.instance().targets(),i=se.SDKUtils.findTargetByExecutionContext(o,t),r=se.SDKUtils.findFrameIdByExecutionContext(o,t);if(!i||!r)throw new Error(`No execution context found for the binding call + ${JSON.stringify(e.data)}`);let n=i.model(N.ResourceTreeModel.ResourceTreeModel);if(!n)throw new Error(`ResourceTreeModel instance is missing for the target: ${i.id()}`);let a=n.frameForId(r);if(!a)throw new Error("Frame is not found");this.onSelectorPicked&&this.onSelectorPicked({...JSON.parse(e.data.payload),...se.SDKUtils.getTargetFrameContext(i,a)}),this.#u()};async#h(e){let o=`${await F.InjectedScript.get()};DevToolsRecorder.startSelectorPicker({getAccessibleName, getAccessibleRole}, ${JSON.stringify(this.#o?this.#o:void 0)}, ${F.isDebugBuild})`,[{identifier:i}]=await Promise.all([e.pageAgent().invoke_addScriptToEvaluateOnNewDocument({source:o,worldName:F.DEVTOOLS_RECORDER_WORLD_NAME,includeCommandLineAPI:!0}),se.SDKUtils.evaluateInAllFrames(F.DEVTOOLS_RECORDER_WORLD_NAME,e,o)]);this.#n.set(e,i)}async#g(e){let t=this.#n.get(e);Me.assertNotNullOrUndefined(t),this.#n.delete(e),await e.pageAgent().invoke_removeScriptToEvaluateOnNewDocument({identifier:t}),await se.SDKUtils.evaluateInAllFrames(F.DEVTOOLS_RECORDER_WORLD_NAME,e,"DevToolsRecorder.stopSelectorPicker()")}async#m(e){let t=e.model(N.RuntimeModel.RuntimeModel);Me.assertNotNullOrUndefined(t),t.addEventListener(N.RuntimeModel.Events.BindingCalled,this.#r),await t.addBinding({name:ot,executionContextName:F.DEVTOOLS_RECORDER_WORLD_NAME})}async#f(e){await e.runtimeAgent().invoke_removeBinding({name:ot});let t=e.model(N.RuntimeModel.RuntimeModel);Me.assertNotNullOrUndefined(t),t.removeEventListener(N.RuntimeModel.Events.BindingCalled,this.#r)}wasShown(){super.wasShown(),this.requestUpdate()}wasHidden(){super.wasHidden(),this.#u()}};var Wt=`*{box-sizing:border-box;padding:0;margin:0;font-size:inherit}:host{display:block}.row{display:flex;flex-direction:row;color:var(--sys-color-token-property-special);font-family:var(--monospace-font-family);font-size:var(--monospace-font-size);align-items:center;line-height:18px;margin-top:3px}.row devtools-button{line-height:1;margin-left:0.5em}.separator{margin-right:0.5em;color:var(--sys-color-on-surface)}.padded{margin-left:2em}.padded.double{margin-left:4em}.inline-button{width:18px;height:18px;opacity:0%;visibility:hidden;transition:opacity 200ms;flex-shrink:0}.row:focus-within .inline-button,
.row:hover .inline-button{opacity:100%;visibility:visible}.wrapped.row{flex-wrap:wrap}.gap.row{gap:5px}.gap.row devtools-button{margin-left:0}.regular-font{font-family:inherit;font-size:inherit}.no-margin{margin:0}.row-buttons{margin-top:3px}.error{margin:3px 0 6px;padding:8px 12px;background:var(--sys-color-error-container);color:var(--sys-color-error)}
/*# sourceURL=${import.meta.resolve("./stepEditor.css")} */`;function oe(s,e="Assertion failed!"){if(!s)throw new Error(e)}var ie=s=>{for(let e of Reflect.ownKeys(s)){let t=s[e];(t&&typeof t=="object"||typeof t=="function")&&ie(t)}return Object.freeze(s)},z=class{value;constructor(e){this.value=e}},f=class{value;constructor(e){this.value=e}},B=(s,e)=>{if(e instanceof f){oe(Array.isArray(s),`Expected an array. Got ${typeof s}.`);let t=[...s],o=Object.keys(e.value).sort((i,r)=>Number(r)-Number(i));for(let i of o){let r=e.value[Number(i)];r===void 0?t.splice(Number(i),1):r instanceof z?t.splice(Number(i),0,r.value):t[Number(i)]=B(t[i],r)}return Object.freeze(t)}if(typeof e=="object"&&!Array.isArray(e)){oe(!Array.isArray(s),"Expected an object. Got an array.");let t={...s},o=Object.keys(e);for(let i of o){let r=e[i];r===void 0?delete t[i]:t[i]=B(t[i],r)}return Object.freeze(t)}return e};var ue=function(s,e,t,o){var i=arguments.length,r=i<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,t):o,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(s,e,t,o);else for(var a=s.length-1;a>=0;a--)(n=s[a])&&(r=(i<3?n(r):i>3?n(e,t,r):n(e,t))||r);return i>3&&r&&Object.defineProperty(e,t,r),r},{html:E,Decorators:Es,Directives:Cs,LitElement:Ts}=ks,{customElement:Is,property:Xt,state:Yt}=Es,{live:K}=Cs,{widget:Rs}=Gt.Widget,Ls=Object.freeze({string:s=>s.trim(),number:s=>{let e=parseFloat(s);return Number.isNaN(e)?0:e},boolean:s=>s.toLowerCase()==="true"}),Ht=Object.freeze({selectors:"string",offsetX:"number",offsetY:"number",target:"string",frame:"number",assertedEvents:"string",value:"string",key:"string",operator:"string",count:"number",expression:"string",x:"number",y:"number",url:"string",type:"string",timeout:"number",duration:"number",button:"string",deviceType:"string",width:"number",height:"number",deviceScaleFactor:"number",isMobile:"boolean",hasTouch:"boolean",isLandscape:"boolean",download:"number",upload:"number",latency:"number",name:"string",parameters:"string",visible:"boolean",properties:"string",attributes:"string"}),x=ie({selectors:[[".cls"]],offsetX:1,offsetY:1,target:"main",frame:[0],assertedEvents:[{type:"navigation",url:"https://example.com",title:"Title"}],value:"Value",key:"Enter",operator:">=",count:1,expression:"true",x:0,y:0,url:"https://example.com",timeout:5e3,duration:50,deviceType:"mouse",button:"primary",type:"click",width:800,height:600,deviceScaleFactor:1,isMobile:!1,hasTouch:!1,isLandscape:!0,download:1e3,upload:1e3,latency:25,name:"customParam",parameters:"{}",properties:"{}",attributes:[{name:"attribute",value:"value"}],visible:!0}),lt=ie({[m.Schema.StepType.Click]:{required:["selectors","offsetX","offsetY"],optional:["assertedEvents","button","deviceType","duration","frame","target","timeout"]},[m.Schema.StepType.DoubleClick]:{required:["offsetX","offsetY","selectors"],optional:["assertedEvents","button","deviceType","frame","target","timeout"]},[m.Schema.StepType.Hover]:{required:["selectors"],optional:["assertedEvents","frame","target","timeout"]},[m.Schema.StepType.Change]:{required:["selectors","value"],optional:["assertedEvents","frame","target","timeout"]},[m.Schema.StepType.KeyDown]:{required:["key"],optional:["assertedEvents","target","timeout"]},[m.Schema.StepType.KeyUp]:{required:["key"],optional:["assertedEvents","target","timeout"]},[m.Schema.StepType.Scroll]:{required:[],optional:["assertedEvents","frame","target","timeout","x","y"]},[m.Schema.StepType.Close]:{required:[],optional:["assertedEvents","target","timeout"]},[m.Schema.StepType.Navigate]:{required:["url"],optional:["assertedEvents","target","timeout"]},[m.Schema.StepType.WaitForElement]:{required:["selectors"],optional:["assertedEvents","attributes","count","frame","operator","properties","target","timeout","visible"]},[m.Schema.StepType.WaitForExpression]:{required:["expression"],optional:["assertedEvents","frame","target","timeout"]},[m.Schema.StepType.CustomStep]:{required:["name","parameters"],optional:["assertedEvents","target","timeout"]},[m.Schema.StepType.EmulateNetworkConditions]:{required:["download","latency","upload"],optional:["assertedEvents","target","timeout"]},[m.Schema.StepType.SetViewport]:{required:["deviceScaleFactor","hasTouch","height","isLandscape","isMobile","width"],optional:["assertedEvents","target","timeout"]}}),M={notSaved:"Not saved: {error}",addAttribute:"Add {attributeName}",deleteRow:"Delete row",addFrameIndex:"Add frame index within the frame tree",removeFrameIndex:"Remove frame index",addSelectorPart:"Add a selector part",removeSelectorPart:"Remove a selector part",addSelector:"Add a selector",removeSelector:"Remove a selector",unknownActionType:"Unknown action type."},Ms=ct.i18n.registerUIStrings("panels/recorder/components/StepEditor.ts",M),A=ct.i18n.getLocalizedString.bind(void 0,Ms),Ne=class s extends Event{static eventName="stepedited";data;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.data=e}},Us=s=>JSON.parse(JSON.stringify(s)),J=class{static#t=new _t.SharedObject.SharedObject(()=>m.RecordingPlayer.RecordingPlayer.connectPuppeteer(),({browser:e})=>m.RecordingPlayer.RecordingPlayer.disconnectPuppeteer(e));static async default(e){let t={type:e},o=lt[t.type],i=Promise.resolve();for(let r of o.required)i=Promise.all([i,(async()=>Object.assign(t,{[r]:await this.defaultByAttribute(t,r)}))()]);return await i,Object.freeze(t)}static async defaultByAttribute(e,t){return await this.#t.run(o=>{switch(t){case"assertedEvents":return B(x.assertedEvents,new f({0:{url:o.page.url()||x.assertedEvents[0].url}}));case"url":return o.page.url()||x.url;case"height":return o.page.evaluate(()=>visualViewport.height)||x.height;case"width":return o.page.evaluate(()=>visualViewport.width)||x.width;default:return x[t]}})}static fromStep(e){let t=structuredClone(e);for(let o of["parameters","properties"])o in e&&e[o]!==void 0&&(t[o]=JSON.stringify(e[o]));if("attributes"in e&&e.attributes){t.attributes=[];for(let[o,i]of Object.entries(e.attributes))t.attributes.push({name:o,value:i})}return"selectors"in e&&(t.selectors=e.selectors.map(o=>typeof o=="string"?[o]:[...o])),ie(t)}static toStep(e){let t=structuredClone(e);for(let o of["parameters","properties"]){let i=e[o];i&&Object.assign(t,{[o]:JSON.parse(i)})}if(e.attributes)if(e.attributes.length!==0){let o={};for(let{name:i,value:r}of e.attributes)Object.assign(o,{[i]:r});Object.assign(t,{attributes:o})}else"attributes"in t&&delete t.attributes;if(e.selectors){let o=e.selectors.filter(i=>i.length>0).map(i=>i.length===1?i[0]:[...i]);o.length!==0?Object.assign(t,{selectors:o}):"selectors"in t&&delete t.selectors}return e.frame?.length===0&&"frame"in t&&delete t.frame,Us(m.SchemaUtils.parseStep(t))}},Z=class extends Ts{#t=new Set;constructor(){super(),this.state={type:m.Schema.StepType.WaitForElement},this.isTypeEditable=!0,this.disabled=!1}createRenderRoot(){let e=super.createRenderRoot();return e.addEventListener("keydown",this.#a),e}set step(e){this.state=ie(J.fromStep(e)),this.error=void 0}#e(e){try{this.dispatchEvent(new Ne(J.toStep(e))),this.state=e}catch(t){this.error=t.message}}#s=e=>{this.#e(B(this.state,{target:e.target,frame:e.frame,selectors:e.selectors.map(t=>typeof t=="string"?[t]:t),offsetX:e.offsetX,offsetY:e.offsetY}))};#o=e=>{this.dispatchEvent(new de(e))};#i=(e,t)=>o=>{o.preventDefault(),o.stopPropagation(),this.#e(B(this.state,e)),this.#v(t)};#a=e=>{if(oe(e instanceof KeyboardEvent),e.target instanceof Ue.SuggestionInput.SuggestionInput&&e.key==="Enter"){e.preventDefault(),e.stopPropagation();let t=this.renderRoot.querySelectorAll("devtools-suggestion-input"),o=[...t].findIndex(i=>i===e.target);o>=0&&o+1<t.length?t[o+1].focus():e.target.blur()}};#n=e=>t=>{if(oe(t.target instanceof Ue.SuggestionInput.SuggestionInput),t.target.disabled)return;let o=Ht[e.attribute],i=Ls[o](t.target.value),r=e.from.bind(this)(i);r&&this.#e(B(this.state,r))};#l=async e=>{if(oe(e.target instanceof Ue.SuggestionInput.SuggestionInput),e.target.disabled)return;let t=e.target.value;if(t!==this.state.type){if(!Object.values(m.Schema.StepType).includes(t)){this.error=A(M.unknownActionType);return}this.#e(await J.default(t))}};#d=async e=>{e.preventDefault(),e.stopPropagation();let t=e.target.dataset.attribute;this.#e(B(this.state,{[t]:await J.defaultByAttribute(this.state,t)})),this.#v(`[data-attribute=${t}].attribute devtools-suggestion-input`)};#c(e){if(!this.disabled)return E`
      <devtools-button
        title=${e.title}
        .accessibleLabel=${e.title}
        .size=${"SMALL"}
        .iconName=${e.iconName}
        .variant=${"icon"}
        jslog=${w.action(e.class).track({click:!0})}
        class="inline-button ${e.class}"
        @click=${e.onClick}
      ></devtools-button>
    `}#p(e){if(!(this.disabled||![...lt[this.state.type].optional].includes(e)||this.disabled))return E`<devtools-button
      .size=${"SMALL"}
      .iconName=${"bin"}
      .variant=${"icon"}
      .title=${A(M.deleteRow)}
      class="inline-button delete-row"
      data-attribute=${e}
      jslog=${w.action("delete").track({click:!0})}
      @click=${i=>{i.preventDefault(),i.stopPropagation(),this.#e(B(this.state,{[e]:void 0}))}}
    ></devtools-button>`}#u(e){return this.#t.add("type"),E`<div class="row attribute" data-attribute="type" jslog=${w.treeItem("type").track({resize:!0})}>
      <div id="type">type<span class="separator">:</span></div>
      <devtools-suggestion-input
        aria-labelledby="type"
        .disabled=${!e||this.disabled}
        .options=${Object.values(m.Schema.StepType)}
        .placeholder=${x.type}
        .value=${K(this.state.type)}
        @blur=${this.#l}
      ></devtools-suggestion-input>
    </div>`}#r(e){this.#t.add(e);let t=this.state[e]?.toString();if(t!==void 0)return E`<div class="row attribute" data-attribute=${e} jslog=${w.treeItem(at.StringUtilities.toKebabCase(e)).track({resize:!0})}>
      <div id=${e}>${e}<span class="separator">:</span></div>
      <devtools-suggestion-input
        .disabled=${this.disabled}
        aria-labelledby=${e}
        .placeholder=${x[e].toString()}
        .value=${K(t)}
        .mimeType=${(()=>{switch(e){case"expression":return"text/javascript";case"properties":return"application/json";default:return""}})()}
        @blur=${this.#n({attribute:e,from(o){if(this.state[e]!==void 0)return{[e]:o}}})}
      ></devtools-suggestion-input>
      ${this.#p(e)}
    </div>`}#h(){if(this.#t.add("frame"),this.state.frame!==void 0)return E`
      <div class="attribute" data-attribute="frame" jslog=${w.treeItem("frame").track({resize:!0})}>
        <div class="row">
          <div id="frame">frame<span class="separator">:</span></div>
          ${this.#p("frame")}
        </div>
        ${this.state.frame.map((e,t,o)=>E`
            <div class="padded row">
              <devtools-suggestion-input
                aria-labelledby="frame"
                .disabled=${this.disabled}
                .placeholder=${x.frame[0].toString()}
                .value=${K(e.toString())}
                data-path=${`frame.${t}`}
                @blur=${this.#n({attribute:"frame",from(i){if(this.state.frame?.[t]!==void 0)return{frame:new f({[t]:i})}}})}
              ></devtools-suggestion-input>
              ${this.#c({class:"add-frame",title:A(M.addFrameIndex),iconName:"plus",onClick:this.#i({frame:new f({[t+1]:new z(x.frame[0])})},`devtools-suggestion-input[data-path="frame.${t+1}"]`)})}
              ${this.#c({class:"remove-frame",title:A(M.removeFrameIndex),iconName:"minus",onClick:this.#i({frame:new f({[t]:void 0})},`devtools-suggestion-input[data-path="frame.${Math.min(t,o.length-2)}"]`)})}
            </div>
          `)}
      </div>
    `}#g(){if(this.#t.add("selectors"),this.state.selectors!==void 0)return E`<div class="attribute" data-attribute="selectors" jslog=${w.treeItem("selectors")}>
      <div class="row">
        <div>selectors<span class="separator">:</span></div>
        ${Rs(pe,{disabled:this.disabled,onSelectorPicked:this.#s,onAttributeRequested:this.#o})}
        ${this.#p("selectors")}
      </div>
      ${this.state.selectors.map((e,t,o)=>E`<div class="padded row" data-selector-path=${t}>
            <div id="selector-${t}">selector #${t+1}<span class="separator">:</span></div>
            ${this.#c({class:"add-selector",title:A(M.addSelector),iconName:"plus",onClick:this.#i({selectors:new f({[t+1]:new z(structuredClone(x.selectors[0]))})},`devtools-suggestion-input[data-path="selectors.${t+1}.0"]`)})}
            ${this.#c({class:"remove-selector",title:A(M.removeSelector),iconName:"minus",onClick:this.#i({selectors:new f({[t]:void 0})},`devtools-suggestion-input[data-path="selectors.${Math.min(t,o.length-2)}.0"]`)})}
          </div>
          ${e.map((i,r,n)=>E`<div
              class="double padded row"
              data-selector-path="${t}.${r}"
            >
              <devtools-suggestion-input
                aria-labelledby="selector-${t}"
                .disabled=${this.disabled}
                .placeholder=${x.selectors[0][0]}
                .value=${K(i)}
                data-path=${`selectors.${t}.${r}`}
                @blur=${this.#n({attribute:"selectors",from(a){if(this.state.selectors?.[t]?.[r]!==void 0)return{selectors:new f({[t]:new f({[r]:a})})}}})}
              ></devtools-suggestion-input>
              ${this.#c({class:"add-selector-part",title:A(M.addSelectorPart),iconName:"plus",onClick:this.#i({selectors:new f({[t]:new f({[r+1]:new z(x.selectors[0][0])})})},`devtools-suggestion-input[data-path="selectors.${t}.${r+1}"]`)})}
              ${this.#c({class:"remove-selector-part",title:A(M.removeSelectorPart),iconName:"minus",onClick:this.#i({selectors:new f({[t]:new f({[r]:void 0})})},`devtools-suggestion-input[data-path="selectors.${t}.${Math.min(r,n.length-2)}"]`)})}
            </div>`)}`)}
    </div>`}#m(){if(this.#t.add("assertedEvents"),this.state.assertedEvents!==void 0)return E`<div class="attribute" data-attribute="assertedEvents" jslog=${w.treeItem("asserted-events")}>
      <div class="row">
        <div>asserted events<span class="separator">:</span></div>
        ${this.#p("assertedEvents")}
      </div>
      ${this.state.assertedEvents.map((e,t)=>E` <div class="padded row" jslog=${w.treeItem("event-type")}>
            <div id="event-type">type<span class="separator">:</span></div>
            <div aria-labelledby="event-type">${e.type}</div>
          </div>
          <div class="padded row" jslog=${w.treeItem("event-title")}>
            <div id="event-title">title<span class="separator">:</span></div>
            <devtools-suggestion-input
              aria-labelledby="event-title"
              .disabled=${this.disabled}
              .placeholder=${x.assertedEvents[0].title}
              .value=${K(e.title??"")}
              @blur=${this.#n({attribute:"assertedEvents",from(o){if(this.state.assertedEvents?.[t]?.title!==void 0)return{assertedEvents:new f({[t]:{title:o}})}}})}
            ></devtools-suggestion-input>
          </div>
          <div  id="event-url" class="padded row" jslog=${w.treeItem("event-url")}>
            <div>url<span class="separator">:</span></div>
            <devtools-suggestion-input
              aria-labelledby="event-url"
              .disabled=${this.disabled}
              .placeholder=${x.assertedEvents[0].url}
              .value=${K(e.url??"")}
              @blur=${this.#n({attribute:"url",from(o){if(this.state.assertedEvents?.[t]?.url!==void 0)return{assertedEvents:new f({[t]:{url:o}})}}})}
            ></devtools-suggestion-input>
          </div>`)}
    </div> `}#f(){if(this.#t.add("attributes"),this.state.attributes!==void 0)return E`<div class="attribute" data-attribute="attributes" jslog=${w.treeItem("attributes")}>
      <div class="row">
        <div>attributes<span class="separator">:</span></div>
        ${this.#p("attributes")}
      </div>
      ${this.state.attributes.map(({name:e,value:t},o,i)=>E`<div class="padded row" jslog=${w.treeItem("attribute")}>
          <devtools-suggestion-input
            .disabled=${this.disabled}
            .placeholder=${x.attributes[0].name}
            .value=${K(e)}
            data-path=${`attributes.${o}.name`}
            jslog=${w.key().track({change:!0})}
            @blur=${this.#n({attribute:"attributes",from(r){if(this.state.attributes?.[o]?.name!==void 0)return{attributes:new f({[o]:{name:r}})}}})}
          ></devtools-suggestion-input>
          <span class="separator">:</span>
          <devtools-suggestion-input
            .disabled=${this.disabled}
            .placeholder=${x.attributes[0].value}
            .value=${K(t)}
            data-path=${`attributes.${o}.value`}
            @blur=${this.#n({attribute:"attributes",from(r){if(this.state.attributes?.[o]?.value!==void 0)return{attributes:new f({[o]:{value:r}})}}})}
          ></devtools-suggestion-input>
          ${this.#c({class:"add-attribute-assertion",title:A(M.addSelectorPart),iconName:"plus",onClick:this.#i({attributes:new f({[o+1]:new z((()=>{{let r=new Set(i.map(({name:I})=>I)),n=x.attributes[0],a=n.name,g=0;for(;r.has(a);)++g,a=`${n.name}-${g}`;return{...n,name:a}}})())})},`devtools-suggestion-input[data-path="attributes.${o+1}.name"]`)})}
          ${this.#c({class:"remove-attribute-assertion",title:A(M.removeSelectorPart),iconName:"minus",onClick:this.#i({attributes:new f({[o]:void 0})},`devtools-suggestion-input[data-path="attributes.${Math.min(o,i.length-2)}.value"]`)})}
        </div>`)}
    </div>`}#y(){return[...lt[this.state.type].optional].filter(t=>this.state[t]===void 0).map(t=>E`<devtools-button
          .variant=${"outlined"}
          class="add-row"
          data-attribute=${t}
          jslog=${w.action(`add-${at.StringUtilities.toKebabCase(t)}`)}
          @click=${this.#d}
        >
          ${A(M.addAttribute,{attributeName:t})}
        </devtools-button>`)}#v=e=>{this.updateComplete.then(()=>{this.renderRoot.querySelector(e)?.focus()})};render(){this.#t=new Set;let e=E`
      <style>${Wt}</style>
      <div class="wrapper" jslog=${w.tree("step-editor")} >
        ${this.#u(this.isTypeEditable)} ${this.#r("target")}
        ${this.#h()} ${this.#g()}
        ${this.#r("deviceType")} ${this.#r("button")}
        ${this.#r("url")} ${this.#r("x")}
        ${this.#r("y")} ${this.#r("offsetX")}
        ${this.#r("offsetY")} ${this.#r("value")}
        ${this.#r("key")} ${this.#r("operator")}
        ${this.#r("count")} ${this.#r("expression")}
        ${this.#r("duration")} ${this.#m()}
        ${this.#r("timeout")} ${this.#r("width")}
        ${this.#r("height")} ${this.#r("deviceScaleFactor")}
        ${this.#r("isMobile")} ${this.#r("hasTouch")}
        ${this.#r("isLandscape")} ${this.#r("download")}
        ${this.#r("upload")} ${this.#r("latency")}
        ${this.#r("name")} ${this.#r("parameters")}
        ${this.#r("visible")} ${this.#r("properties")}
        ${this.#f()}
        ${this.error?E`
              <div class="error">
                ${A(M.notSaved,{error:this.error})}
              </div>
            `:void 0}
        ${this.disabled?void 0:E`<div
              class="row-buttons wrapped gap row regular-font no-margin"
            >
              ${this.#y()}
            </div>`}
      </div>
    `;for(let t of Object.keys(Ht))if(!this.#t.has(t))throw new Error(`The editable attribute ${t} does not have UI`);return e}};ue([Yt()],Z.prototype,"state",void 0);ue([Yt()],Z.prototype,"error",void 0);ue([Xt({type:Boolean})],Z.prototype,"isTypeEditable",void 0);ue([Xt({type:Boolean})],Z.prototype,"disabled",void 0);Z=ue([Is("devtools-recorder-step-editor")],Z);import*as ut from"./../../../core/i18n/i18n.js";import*as dt from"./../../../core/platform/platform.js";import*as Ae from"./../../../ui/components/menus/menus.js";import*as be from"./../../../ui/legacy/legacy.js";import*as ye from"./../../../ui/lit/lit.js";import*as H from"./../../../ui/visual_logging/visual_logging.js";import*as T from"./../models/models.js";var Zt=`*{margin:0;padding:0;box-sizing:border-box;font-size:inherit}.title-container{min-width:0;font-size:var(--sys-size-7);display:flex;flex-direction:row;gap:var(--sys-size-2);outline-offset:var(--sys-size-2);flex-grow:1;align-items:center}.action{display:flex;align-items:center}.title{flex:1;min-width:0}.is-start-of-group .title{font-weight:bold}.error-icon{display:none}.breakpoint-icon{visibility:hidden;cursor:pointer;opacity:0%;fill:var(--sys-color-primary);stroke:#1a73e8;transform:translate(-1.92px,-3px)}.circle-icon{fill:var(--sys-color-primary);stroke:var(--sys-color-cdt-base-container);stroke-width:4px;r:5px;cx:8px;cy:8px}.is-start-of-group:not(:first-of-type) .circle-icon{r:7px;fill:var(--sys-color-cdt-base-container);stroke:var(--sys-color-primary);stroke-width:2px}.step.is-success .circle-icon{fill:var(--sys-color-primary);stroke:var(--sys-color-primary)}.step.is-current .circle-icon{stroke-dasharray:24 10;animation:rotate 1s linear infinite;fill:var(--sys-color-cdt-base-container);stroke:var(--sys-color-primary);stroke-width:2px}.error{margin:16px 0 0;padding:8px;background:var(--sys-color-error-container);color:var(--sys-color-error);position:relative}@keyframes rotate{0%{transform:translate(8px,8px) rotate(0) translate(-8px,-8px)}100%{transform:translate(8px,8px) rotate(360deg) translate(-8px,-8px)}}.step.is-error .circle-icon{fill:var(--sys-color-error);stroke:var(--sys-color-error)}.step.is-error .error-icon{display:block;transform:translate(4px,4px)}:host-context(.was-successful) .circle-icon{animation:flash-circle 2s}:host-context(.was-successful) .breakpoint-icon{animation:flash-breakpoint-icon 2s}@keyframes flash-circle{25%{fill:var(--override-color-recording-successful-text);stroke:var(--override-color-recording-successful-text)}75%{fill:var(--override-color-recording-successful-text);stroke:var(--override-color-recording-successful-text)}}@keyframes flash-breakpoint-icon{25%{fill:var(--override-color-recording-successful-text);stroke:var(--override-color-recording-successful-text)}75%{fill:var(--override-color-recording-successful-text);stroke:var(--override-color-recording-successful-text)}}.chevron{width:14px;height:14px;transition:200ms;position:absolute;top:14px;left:24px;transform:rotate(-90deg);color:var(--sys-color-on-surface)}.expanded .chevron{transform:rotate(0deg)}.is-start-of-group .chevron{top:34px}.details{display:none;margin-top:8px;position:relative}.expanded .details{display:block}.step-details{overflow:auto}devtools-recorder-step-editor{border:1px solid var(--sys-color-neutral-outline);padding:3px 6px 6px;margin-left:-6px;border-radius:3px}devtools-recorder-step-editor:hover{border:1px solid var(--sys-color-neutral-outline)}devtools-recorder-step-editor.is-selected{background-color:color-mix(in srgb,var(--sys-color-tonal-container),var(--sys-color-cdt-base-container) 50%);border:1px solid var(--sys-color-tonal-outline)}.summary{display:flex;flex-flow:row nowrap}.subtitle{font-weight:normal;color:var(--sys-color-on-surface-subtle);word-break:break-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.main-title{word-break:break-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.step-actions{border:none;border-radius:0;height:24px;--override-select-menu-show-button-border-radius:0;--override-select-menu-show-button-outline:none;--override-select-menu-show-button-padding:0}.step.has-breakpoint .circle-icon{visibility:hidden}.step:not(.is-start-of-group).has-breakpoint .breakpoint-icon{visibility:visible;opacity:100%}.step:not(.is-start-of-group, .has-breakpoint) .icon:hover .circle-icon{transition:opacity 0.2s;opacity:0%}.step:not(.is-start-of-group, .has-breakpoint) .icon:hover .error-icon{visibility:hidden}.step:not(.is-start-of-group, .has-breakpoint) .icon:hover .breakpoint-icon{transition:opacity 0.2s;visibility:visible;opacity:50%}
/*# sourceURL=${import.meta.resolve("./stepView.css")} */`;var ss={};j(ss,{DEFAULT_VIEW:()=>ts,TimelineSection:()=>he});import*as es from"./../../../ui/legacy/legacy.js";import*as ge from"./../../../ui/lit/lit.js";var Qt=`*{margin:0;padding:0;box-sizing:border-box;font-size:inherit}.timeline-section{position:relative;padding:8px 0 8px 40px;margin-left:8px;--override-color-recording-successful-text:#36a854;--override-color-recording-successful-background:#e6f4ea}.overlay{position:absolute;width:100vw;height:100%;left:calc(-32px - 80px);top:0;z-index:-1;pointer-events:none}@container (max-width: 400px){.overlay{left:-32px}}:hover .overlay{background:var(--sys-color-state-hover-on-subtle)}.is-selected .overlay{background:var(--sys-color-tonal-container)}:host-context(.is-stopped) .overlay{background:var(--sys-color-state-ripple-primary);outline:1px solid var(--sys-color-state-focus-ring);z-index:4}.is-start-of-group:not(:first-of-type){padding-top:16px}.is-end-of-group{padding-bottom:16px}.icon{position:absolute;left:4px;transform:translateX(-50%);z-index:2}.bar{position:absolute;left:4px;display:block;transform:translateX(-50%);top:18px;height:100%;z-index:1}.bar .background{fill:var(--sys-color-state-hover-on-subtle)}.bar .line{fill:var(--sys-color-primary)}.is-first-section .bar{height:100%;display:none}.is-first-section:not(.is-last-section) .bar{display:block}.is-last-section .bar .line{display:none}.is-last-section .bar .background{display:none}:host-context(.is-error) .bar .line{fill:var(--sys-color-error)}:host-context(.is-error) .bar .background{fill:var(--sys-color-error-container)}:host-context(.was-successful) .bar .background{animation:flash-background 2s}:host-context(.was-successful) .bar .line{animation:flash-line 2s}@keyframes flash-background{25%{fill:var(--override-color-recording-successful-background)}75%{fill:var(--override-color-recording-successful-background)}}@keyframes flash-line{25%{fill:var(--override-color-recording-successful-text)}75%{fill:var(--override-color-recording-successful-text)}}
/*# sourceURL=${import.meta.resolve("./timelineSection.css")} */`;var{html:Ns}=ge,ts=(s,e,t)=>{let o={"timeline-section":!0,"is-end-of-group":s.isEndOfGroup,"is-start-of-group":s.isStartOfGroup,"is-first-section":s.isFirstSection,"is-last-section":s.isLastSection,"is-selected":s.isSelected};ge.render(Ns`
    <style>${Qt}</style>
    <div class=${ge.Directives.classMap(o)}>
      <div class="overlay"></div>
      <div class="icon"><slot name="icon"></slot></div>
      <svg width="24" height="100%" class="bar">
        <rect class="line" x="7" y="0" width="2" height="100%" />
      </svg>
      <slot></slot>
    </div>
  `,t)},he=class extends es.Widget.Widget{#t=!1;#e=!1;#s=!1;#o=!1;#i=!1;#a;constructor(e,t=ts){super(e,{useShadowDom:!0}),this.#a=t}set isEndOfGroup(e){this.#t=e,this.requestUpdate()}set isStartOfGroup(e){this.#e=e,this.requestUpdate()}set isFirstSection(e){this.#s=e,this.requestUpdate()}set isLastSection(e){this.#o=e,this.requestUpdate()}set isSelected(e){this.#i=e,this.requestUpdate()}performUpdate(){this.#a({isEndOfGroup:this.#t,isStartOfGroup:this.#e,isFirstSection:this.#s,isLastSection:this.#o,isSelected:this.#i},{},this.contentElement)}};var{html:Q}=ye,{widget:As}=be.Widget,c={setViewportClickTitle:"Set viewport",customStepTitle:"Custom step",clickStepTitle:"Click",doubleClickStepTitle:"Double click",hoverStepTitle:"Hover",emulateNetworkConditionsStepTitle:"Emulate network conditions",changeStepTitle:"Change",closeStepTitle:"Close",scrollStepTitle:"Scroll",keyUpStepTitle:"Key up",navigateStepTitle:"Navigate",keyDownStepTitle:"Key down",waitForElementStepTitle:"Wait for element",waitForExpressionStepTitle:"Wait for expression",elementRoleButton:"Button",elementRoleInput:"Input",elementRoleFallback:"Element",addStepBefore:"Add step before",addStepAfter:"Add step after",removeStep:"Remove step",openStepActions:"Open step actions",addBreakpoint:"Add breakpoint",removeBreakpoint:"Remove breakpoint",copyAs:"Copy as",stepManagement:"Manage steps",breakpoints:"Breakpoints"},Ds=ut.i18n.registerUIStrings("panels/recorder/components/StepView.ts",c),d=ut.i18n.getLocalizedString.bind(void 0,Ds),pt=class s extends Event{static eventName="captureselectors";data;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.data=e}},De=class s extends Event{static eventName="copystep";step;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.step=e}},Pe=class s extends Event{static eventName="stepchanged";currentStep;newStep;constructor(e,t){super(s.eventName,{bubbles:!0,composed:!0}),this.currentStep=e,this.newStep=t}},me=class s extends Event{static eventName="addstep";position;stepOrSection;constructor(e,t){super(s.eventName,{bubbles:!0,composed:!0}),this.stepOrSection=e,this.position=t}},Ve=class s extends Event{static eventName="removestep";step;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.step=e}},fe=class s extends Event{static eventName="addbreakpoint";index;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.index=e}},ve=class s extends Event{static eventName="removebreakpoint";index;constructor(e){super(s.eventName,{bubbles:!0,composed:!0}),this.index=e}},W="copy-step-as-";function Ps(s){if(s.section)return s.section.title?s.section.title:Q`<span class="fallback">(No Title)</span>`;if(!s.step)throw new Error("Missing both step and section");switch(s.step.type){case T.Schema.StepType.CustomStep:return d(c.customStepTitle);case T.Schema.StepType.SetViewport:return d(c.setViewportClickTitle);case T.Schema.StepType.Click:return d(c.clickStepTitle);case T.Schema.StepType.DoubleClick:return d(c.doubleClickStepTitle);case T.Schema.StepType.Hover:return d(c.hoverStepTitle);case T.Schema.StepType.EmulateNetworkConditions:return d(c.emulateNetworkConditionsStepTitle);case T.Schema.StepType.Change:return d(c.changeStepTitle);case T.Schema.StepType.Close:return d(c.closeStepTitle);case T.Schema.StepType.Scroll:return d(c.scrollStepTitle);case T.Schema.StepType.KeyUp:return d(c.keyUpStepTitle);case T.Schema.StepType.KeyDown:return d(c.keyDownStepTitle);case T.Schema.StepType.WaitForElement:return d(c.waitForElementStepTitle);case T.Schema.StepType.WaitForExpression:return d(c.waitForExpressionStepTitle);case T.Schema.StepType.Navigate:return d(c.navigateStepTitle)}}function Vs(s){switch(s){case"button":return d(c.elementRoleButton);case"input":return d(c.elementRoleInput);default:return d(c.elementRoleFallback)}}function Os(s){if(!("selectors"in s))return"";let e=s.selectors.flat().find(o=>o.startsWith("aria/"));if(!e)return"";let t=e.match(/^aria\/(.+?)(\[role="(.+)"\])?$/);return t?`${Vs(t[3])} "${t[1]}"`:""}function js(s){return s?s.url:""}function Fs(s){return Q`
    <devtools-menu-button
      class="step-actions"
      title=${d(c.openStepActions)}
      aria-label=${d(c.openStepActions)}
      .populateMenuCall=${s.populateStepContextMenu}
      @keydown=${e=>{e.stopPropagation()}}
      jslog=${H.dropDown("step-actions").track({click:!0})}
      .iconName=${"dots-vertical"}
    ></devtools-menu-button>
  `}var os=(s,e,t)=>{if(!s.step&&!s.section)return;let o={step:!0,expanded:s.showDetails,"is-success":s.state==="success","is-current":s.state==="current","is-outstanding":s.state==="outstanding","is-error":s.state==="error","is-stopped":s.state==="stopped","is-start-of-group":s.isStartOfGroup,"is-first-section":s.isFirstSection,"has-breakpoint":s.hasBreakpoint},i=!!s.step,r=Ps({step:s.step,section:s.section}),n=s.step?Os(s.step):js(s.section);ye.render(Q`
    <style>${Zt}</style>
    <div>
      <devtools-widget ${As(he,{isFirstSection:s.isFirstSection,isLastSection:s.isLastSection,isStartOfGroup:s.isStartOfGroup,isEndOfGroup:s.isEndOfGroup,isSelected:s.isSelected})}
        @contextmenu=${a=>{let g=new be.ContextMenu.ContextMenu(a);s.populateStepContextMenu(g),g.show()}}
        data-step-index=${s.stepIndex}
        data-section-index=${s.sectionIndex}
        @click=${a=>{a.stopPropagation();let g=s.step||s.section;g&&s.onStepClick(g)}}
        @mouseover=${()=>{let a=s.step||s.section;a&&s.onStepHover(a)}}
        class=${ye.Directives.classMap(o)}>
        <svg slot="icon" width="24" height="24" class="icon">
          <circle class="circle-icon"/>
          <g class="error-icon">
            <path d="M1.5 1.5L6.5 6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M1.5 6.5L6.5 1.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <path @click=${s.onBreakpointClick} jslog=${H.action("breakpoint").track({click:!0})} class="breakpoint-icon" d="M2.5 5.5H17.7098L21.4241 12L17.7098 18.5H2.5V5.5Z"/>
        </svg>
        <div class="summary">
          <div class="title-container ${i?"action":""}"
            @click=${i?s.toggleShowDetails:void 0}
            @keydown=${i?s.onToggleShowDetailsKeydown:void 0}
            tabindex="0"
            jslog=${H.sectionHeader().track({click:!0})}
            aria-role=${i?"button":""}
            aria-label=${i?"Show details for step":""}
          >
            ${i?Q`<devtools-icon
                    class="chevron"
                    jslog=${H.expand().track({click:!0})}
                    name="triangle-down">
                  </devtools-icon>`:""}
            <div class="title">
              <div class="main-title" title=${r}>${r}</div>
              <div class="subtitle" title=${n}>${n}</div>
            </div>
          </div>
          ${Fs(s)}
        </div>
        <div class="details">
          ${s.step&&Q`<devtools-recorder-step-editor
            class=${s.isSelected?"is-selected":""}
            .step=${s.step}
            .disabled=${s.isPlaying}
            @stepedited=${s.stepEdited}>
          </devtools-recorder-step-editor>`}
          ${s.section?.causingStep&&Q`<devtools-recorder-step-editor
            .step=${s.section.causingStep}
            .isTypeEditable=${!1}
            .disabled=${s.isPlaying}
            @stepedited=${s.stepEdited}>
          </devtools-recorder-step-editor>`}
        </div>
        ${s.error&&Q`
          <div class="error" role="alert">
            ${s.error.message}
          </div>
        `}
      </devtools-widget>
    </div>
  `,t)},re=class extends be.Widget.Widget{#t=new IntersectionObserver(e=>{this.#e.isVisible=e[0].isIntersecting});#e={state:"default",showDetails:!1,isEndOfGroup:!1,isStartOfGroup:!1,stepIndex:0,sectionIndex:0,isFirstSection:!1,isLastSection:!1,isRecording:!1,isPlaying:!1,isVisible:!1,hasBreakpoint:!1,removable:!0,builtInConverters:[],extensionConverters:[],isSelected:!1,actions:[],stepEdited:this.#a.bind(this),onBreakpointClick:this.#l.bind(this),handleStepAction:this.#n.bind(this),toggleShowDetails:this.#o.bind(this),onToggleShowDetailsKeydown:this.#i.bind(this),populateStepContextMenu:this.#c.bind(this),onStepClick:()=>{},onStepHover:()=>{}};#s;constructor(e,t){super(e,{useShadowDom:!0,classes:["step-view-widget"]}),this.#s=t||os}set step(e){this.#e.step=e,this.requestUpdate()}set section(e){this.#e.section=e,this.requestUpdate()}set state(e){let t=this.#e.state;this.#e.state=e,this.performUpdate(),this.#e.state!==t&&this.#e.state==="current"&&!this.#e.isVisible&&this.contentElement.scrollIntoView()}set error(e){this.#e.error=e,this.requestUpdate()}set isEndOfGroup(e){this.#e.isEndOfGroup=e,this.requestUpdate()}set isStartOfGroup(e){this.#e.isStartOfGroup=e,this.requestUpdate()}set stepIndex(e){this.#e.stepIndex=e,this.requestUpdate()}set sectionIndex(e){this.#e.sectionIndex=e,this.requestUpdate()}set isFirstSection(e){this.#e.isFirstSection=e,this.requestUpdate()}set isLastSection(e){this.#e.isLastSection=e,this.requestUpdate()}set isRecording(e){this.#e.isRecording=e,this.requestUpdate()}set isPlaying(e){this.#e.isPlaying=e,this.requestUpdate()}set hasBreakpoint(e){this.#e.hasBreakpoint=e,this.requestUpdate()}set removable(e){this.#e.removable=e,this.requestUpdate()}set builtInConverters(e){this.#e.builtInConverters=e,this.requestUpdate()}set extensionConverters(e){this.#e.extensionConverters=e,this.requestUpdate()}set isSelected(e){this.#e.isSelected=e,this.requestUpdate()}set recorderSettings(e){this.#e.recorderSettings=e,this.requestUpdate()}set onStepClick(e){this.#e.onStepClick=e,this.requestUpdate()}set onStepHover(e){this.#e.onStepHover=e,this.requestUpdate()}get step(){return this.#e.step}get section(){return this.#e.section}wasShown(){super.wasShown(),this.#t.observe(this.contentElement),this.requestUpdate()}willHide(){super.willHide(),this.#t.unobserve(this.contentElement)}#o(){this.#e.showDetails=!this.#e.showDetails,this.requestUpdate()}#i(e){let t=e;(t.key==="Enter"||t.key===" ")&&(this.#o(),e.stopPropagation(),e.preventDefault())}#a(e){let t=this.#e.step||this.#e.section?.causingStep;if(!t)throw new Error("Expected step.");this.contentElement.dispatchEvent(new Pe(t,e.data))}#n(e){switch(e.itemValue){case"add-step-before":{let t=this.#e.step||this.#e.section;if(!t)throw new Error("Expected step or section.");this.contentElement.dispatchEvent(new me(t,"before"));break}case"add-step-after":{let t=this.#e.step||this.#e.section;if(!t)throw new Error("Expected step or section.");this.contentElement.dispatchEvent(new me(t,"after"));break}case"remove-step":{let t=this.#e.section?.causingStep;if(!this.#e.step&&!t)throw new Error("Expected step.");this.contentElement.dispatchEvent(new Ve(this.#e.step||t));break}case"add-breakpoint":{if(!this.#e.step)throw new Error("Expected step");this.contentElement.dispatchEvent(new fe(this.#e.stepIndex));break}case"remove-breakpoint":{if(!this.#e.step)throw new Error("Expected step");this.contentElement.dispatchEvent(new ve(this.#e.stepIndex));break}default:{let t=e.itemValue;if(!t.startsWith(W))throw new Error("Unknown step action.");let o=this.#e.step||this.#e.section?.causingStep;if(!o)throw new Error("Step not found.");let i=t.substring(W.length);this.#e.recorderSettings&&(this.#e.recorderSettings.preferredCopyFormat=i),this.contentElement.dispatchEvent(new De(structuredClone(o)))}}}#l(){this.#e.hasBreakpoint?this.contentElement.dispatchEvent(new ve(this.#e.stepIndex)):this.contentElement.dispatchEvent(new fe(this.#e.stepIndex)),this.requestUpdate()}#d=()=>{let e=[];if(this.#e.isPlaying||(this.#e.step&&e.push({id:"add-step-before",label:d(c.addStepBefore),group:"stepManagement",groupTitle:d(c.stepManagement)}),e.push({id:"add-step-after",label:d(c.addStepAfter),group:"stepManagement",groupTitle:d(c.stepManagement)}),this.#e.removable&&e.push({id:"remove-step",group:"stepManagement",groupTitle:d(c.stepManagement),label:d(c.removeStep)})),this.#e.step&&!this.#e.isRecording&&(this.#e.hasBreakpoint?e.push({id:"remove-breakpoint",label:d(c.removeBreakpoint),group:"breakPointManagement",groupTitle:d(c.breakpoints)}):e.push({id:"add-breakpoint",label:d(c.addBreakpoint),group:"breakPointManagement",groupTitle:d(c.breakpoints)})),this.#e.step){for(let t of this.#e.builtInConverters||[])e.push({id:W+dt.StringUtilities.toKebabCase(t.getId()),label:t.getFormatName(),group:"copy",groupTitle:d(c.copyAs)});for(let t of this.#e.extensionConverters||[])e.push({id:W+dt.StringUtilities.toKebabCase(t.getId()),label:t.getFormatName(),group:"copy",groupTitle:d(c.copyAs),jslogContext:W+"extension"})}return e};#c(e){let t=this.#d(),o=t.filter(n=>n.id.startsWith(W)),i=t.filter(n=>!n.id.startsWith(W));for(let n of i)e.section(n.group).appendItem(n.label,()=>{this.#n(new Ae.Menu.MenuItemSelectedEvent(n.id))},{jslogContext:n.id});let r=o.find(n=>n.id===W+this.#e.recorderSettings?.preferredCopyFormat);if(r&&e.section("copy").appendItem(r.label,()=>{this.#n(new Ae.Menu.MenuItemSelectedEvent(r.id))},{jslogContext:r.id}),o.length){let n=e.section("copy").appendSubMenuItem(d(c.copyAs),!1,"copy");for(let a of o)a!==r&&n.section(a.group).appendItem(a.label,()=>{this.#n(new Ae.Menu.MenuItemSelectedEvent(a.id))},{jslogContext:a.id})}}performUpdate(){this.#e.actions=this.#d(),this.#s(this.#e,void 0,this.contentElement)}};var{html:l}=$,{widget:Oe}=G.Widget,p={mobile:"Mobile",desktop:"Desktop",latency:"Latency: {value} ms",upload:"Upload: {value}",download:"Download: {value}",editReplaySettings:"Edit replay settings",replaySettings:"Replay settings",default:"Default",environment:"Environment",screenshotForSection:"Screenshot for this section",editTitle:"Edit title",requiredTitleError:"Title is required",recording:"Recording\u2026",endRecording:"End recording",recordingIsBeingStopped:"Stopping recording\u2026",timeout:"Timeout: {value} ms",network:"Network",timeoutLabel:"Timeout",timeoutExplanation:"The timeout setting (in milliseconds) applies to every action when replaying the recording. For example, if a DOM element identified by a CSS selector does not appear on the page within the specified timeout, the replay fails with an error.",cancelReplay:"Cancel replay",showCode:"Show code",hideCode:"Hide code",addAssertion:"Add assertion",performancePanel:"Performance panel",codeSidebarOpened:"Code sidebar opened",codeSidebarClosed:"Code sidebar closed"},Bs=ne.i18n.registerUIStrings("panels/recorder/components/RecordingView.ts",p),u=ne.i18n.getLocalizedString.bind(void 0,Bs),ht=[V.NetworkManager.NoThrottlingConditions,V.NetworkManager.OfflineConditions,V.NetworkManager.Slow3GConditions,V.NetworkManager.Slow4GConditions,V.NetworkManager.Fast4GConditions];function qs({settings:s,replaySettingsExpanded:e,onSelectMenuLabelClick:t,onNetworkConditionsChange:o,onTimeoutInput:i,isRecording:r,replayState:n,onReplaySettingsKeydown:a,onToggleReplaySettings:g}){if(!s)return $.nothing;let I=[];s.viewportSettings&&(I.push(l`<div>${s.viewportSettings.isMobile?u(p.mobile):u(p.desktop)}</div>`),I.push(l`<div class="separator"></div>`),I.push(l`<div>${s.viewportSettings.width}×${s.viewportSettings.height} px</div>`));let y=[];if(!e)s.networkConditionsSettings?s.networkConditionsSettings.title?y.push(l`<div>${s.networkConditionsSettings.title}</div>`):y.push(l`<div>
          ${u(p.download,{value:ne.ByteUtilities.bytesToString(s.networkConditionsSettings.download)})},
          ${u(p.upload,{value:ne.ByteUtilities.bytesToString(s.networkConditionsSettings.upload)})},
          ${u(p.latency,{value:s.networkConditionsSettings.latency})}
        </div>`):y.push(l`<div>${V.NetworkManager.NoThrottlingConditions.title instanceof Function?V.NetworkManager.NoThrottlingConditions.title():V.NetworkManager.NoThrottlingConditions.title}</div>`),y.push(l`<div class="separator"></div>`),y.push(l`<div>${u(p.timeout,{value:s.timeout||O.RecordingPlayer.defaultTimeout})}</div>`);else{let b=s.networkConditionsSettings?.i18nTitleKey||V.NetworkManager.NoThrottlingConditions.i18nTitleKey,_=ht.find(q=>q.i18nTitleKey===b),ft="";_&&(ft=_.title instanceof Function?_.title():_.title),y.push(l`<div class="editable-setting">
      <label class="wrapping-label" @click=${t}>
        ${u(p.network)}
        <select
            title=${ft}
            jslog=${h.dropDown("network-conditions").track({change:!0})}
            @change=${o}>
      ${ht.map(q=>l`
        <option jslog=${h.item(mt.StringUtilities.toKebabCase(q.i18nTitleKey||""))}
                value=${q.i18nTitleKey||""} ?selected=${b===q.i18nTitleKey}>
                ${q.title instanceof Function?q.title():q.title}
        </option>`)}
    </select>
      </label>
    </div>`),y.push(l`<div class="editable-setting">
      <label class="wrapping-label" title=${u(p.timeoutExplanation)}>
        ${u(p.timeoutLabel)}
        <input
          @input=${i}
          required
          min=${O.SchemaUtils.minTimeout}
          max=${O.SchemaUtils.maxTimeout}
          value=${s.timeout||O.RecordingPlayer.defaultTimeout}
          jslog=${h.textField("timeout").track({change:!0})}
          class="devtools-text-input"
          type="number">
      </label>
    </div>`)}let v=!r&&!n.isPlaying,S={"settings-title":!0,expanded:e},R={expanded:e,settings:!0};return l`
    <div class="settings-row">
      <div class="settings-container">
        <div
          class=${$.Directives.classMap(S)}
          @keydown=${v&&a}
          @click=${v&&g}
          aria-expanded=${S.expanded??!1}
          tabindex="0"
          role="button"
          jslog=${h.action("replay-settings").track({click:!0})}
          aria-label=${u(p.editReplaySettings)}>
          <span>${u(p.replaySettings)}</span>
          ${v?l`<devtools-icon
                  class="chevron"
                  name="triangle-down">
                </devtools-icon>`:""}
        </div>
        <div class=${$.Directives.classMap(R)}>
          ${y.length?y:l`<div>${u(p.default)}</div>`}
        </div>
      </div>
      <div class="settings-container">
        <div class="settings-title">${u(p.environment)}</div>
        <div class="settings">
          ${I.length?I:l`<div>${u(p.default)}</div>`}
        </div>
      </div>
    </div>
  `}function zs(s,e){return s.extensionDescriptor?l`
        <devtools-recorder-extension-view .descriptor=${s.extensionDescriptor}>
        </devtools-recorder-extension-view>
      `:l`
        <devtools-split-view
          direction="auto"
          sidebar-position="second"
          sidebar-initial-size="300"
          sidebar-visibility=${s.showCodeView?"":"hidden"}
        >
          <div slot="main">
            ${Gs(s)}
          </div>
          <div slot="sidebar" jslog=${h.pane("source-code").track({resize:!0})}>
            ${s.showCodeView?l`
            <div class="section-toolbar" jslog=${h.toolbar()}>
              <devtools-select-menu
                @selectmenuselected=${s.onCodeFormatChange}
                .showDivider=${!0}
                .showArrow=${!0}
                .sideButton=${!1}
                .showSelectedItem=${!0}
                .position=${"bottom"}
                .buttonTitle=${s.converterName||""}
                .jslogContext=${"code-format"}
              >
                ${s.builtInConverters.map(t=>l`<devtools-menu-item
                    .value=${t.getId()}
                    .selected=${s.converterId===t.getId()}
                    jslog=${h.action().track({click:!0}).context(`converter-${mt.StringUtilities.toKebabCase(t.getId())}`)}
                  >
                    ${t.getFormatName()}
                  </devtools-menu-item>`)}
                ${s.extensionConverters.map(t=>l`<devtools-menu-item
                    .value=${t.getId()}
                    .selected=${s.converterId===t.getId()}
                    jslog=${h.action().track({click:!0}).context("converter-extension")}
                  >
                    ${t.getFormatName()}
                  </devtools-menu-item>`)}
              </devtools-select-menu>
              <devtools-button
                title=${O.Tooltip.getTooltipForActions(u(p.hideCode),"chrome-recorder.toggle-code-view")}
                .data=${{variant:"icon",size:"SMALL",iconName:"cross"}}
                @click=${s.showCodeToggle}
                jslog=${h.close().track({click:!0})}
              ></devtools-button>
            </div>
            ${Ks(s,e)}`:$.nothing}
          </div>
        </devtools-split-view>
      `}function Ks(s,e){if(!s.editorState)throw new Error("Unexpected: trying to render the text editor without editorState");return l`
    <div class="text-editor" jslog=${h.textField().track({change:!0})}>
      <devtools-text-editor .state=${s.editorState} ${$.Directives.ref(t=>{!t||!(t instanceof Fe.TextEditor.TextEditor)||(e.highlightLinesInEditor=(o,i,r=!1)=>{let n=t.editor,a=t.createSelection({lineNumber:o+i,columnNumber:0},{lineNumber:o,columnNumber:0}),g=t.state.doc.lineAt(a.main.anchor);a=t.createSelection({lineNumber:o+i-1,columnNumber:g.length+1},{lineNumber:o,columnNumber:0}),n.dispatch({selection:a,effects:r?[ae.EditorView.scrollIntoView(a.main,{y:"nearest"})]:void 0})})})}></devtools-text-editor>
    </div>
  `}function Ws(s){return s.screenshot?l`
      <img class="screenshot" src=${s.screenshot} alt=${u(p.screenshotForSection)} />
    `:null}function Hs(s){return s.replayState.isPlaying?l`
        <devtools-button .jslogContext=${"abort-replay"} @click=${s.onAbortReplay} .iconName=${"pause"} .variant=${"outlined"}>
          ${u(p.cancelReplay)}
        </devtools-button>`:s.recorderSettings?l`${Oe(le,{settings:s.recorderSettings,replayExtensions:s.replayExtensions,onStartReplay:s.onTogglePlaying,disabled:s.replayState.isPlaying})}`:$.nothing}function Gs(s){return l`
      <div class="sections">
      ${s.showCodeView?"":l`<div class="section-toolbar">
        <devtools-button
          @click=${s.showCodeToggle}
          class="show-code"
          .data=${{variant:"outlined",title:O.Tooltip.getTooltipForActions(u(p.showCode),"chrome-recorder.toggle-code-view")}}
          jslog=${h.toggleSubpane("chrome-recorder.toggle-code-view").track({click:!0})}
        >
          ${u(p.showCode)}
        </devtools-button>
      </div>`}
      ${s.sections.map((e,t)=>l`
            <div class="section">
              <div class="screenshot-wrapper">
                ${Ws(e)}
              </div>
              <div class="content">
                <div class="steps">
                  ${Oe(re,{section:e,state:s.getSectionState(e),isStartOfGroup:!0,isEndOfGroup:e.steps.length===0,isFirstSection:t===0,isLastSection:t===s.sections.length-1&&e.steps.length===0,isSelected:s.selectedStep===(e.causingStep||null),sectionIndex:t,isRecording:s.isRecording,isPlaying:s.replayState.isPlaying,error:s.getSectionState(e)==="error"?s.currentError??void 0:void 0,hasBreakpoint:!1,removable:s.recording.steps.length>1&&!!e.causingStep,onStepClick:s.onStepClick,onStepHover:s.onStepHover})}
                  ${e.steps.map(o=>{let i=s.recording.steps.indexOf(o);return l`
                      <devtools-widget
                      @copystep=${s.onCopyStep}
                      ${Oe(re,{step:o,state:s.getStepState(o),error:s.currentStep===o?s.currentError??void 0:void 0,isFirstSection:!1,isLastSection:t===s.sections.length-1&&s.recording.steps[s.recording.steps.length-1]===o,isStartOfGroup:!1,isEndOfGroup:e.steps[e.steps.length-1]===o,stepIndex:i,hasBreakpoint:s.breakpointIndexes.has(i),sectionIndex:-1,isRecording:s.isRecording,isPlaying:s.replayState.isPlaying,removable:s.recording.steps.length>1,builtInConverters:s.builtInConverters,extensionConverters:s.extensionConverters,isSelected:s.selectedStep===o,recorderSettings:s.recorderSettings??void 0,onStepClick:s.onStepClick,onStepHover:s.onStepHover})}
                      jslog=${h.section("step").track({click:!0})}
                      ></devtools-widget>
                    `})}
                  ${!s.recordingTogglingInProgress&&s.isRecording&&t===s.sections.length-1?l`<devtools-button
                    class="step add-assertion-button"
                    .data=${{variant:"outlined",title:u(p.addAssertion),jslogContext:"add-assertion"}}
                    @click=${s.onAddAssertion}
                  >${u(p.addAssertion)}</devtools-button>`:void 0}
                  ${s.isRecording&&t===s.sections.length-1?l`<div class="step recording">${u(p.recording)}</div>`:null}
                </div>
              </div>
            </div>
      `)}
      </div>
    `}function _s(s){if(!s.recording)return $.nothing;let{title:e}=s.recording,t=!s.replayState.isPlaying&&!s.isRecording;return l`
    <div class="header">
      <div class="header-title-wrapper">
        <div class="header-title">
          <input @blur=${s.onTitleBlur}
                @keydown=${s.onTitleInputKeyDown}
                id="title-input"
                jslog=${h.value("title").track({change:!0})}
                class=${$.Directives.classMap({"has-error":s.isTitleInvalid,disabled:!t})}
                .value=${$.Directives.live(e)}
                .disabled=${!t}
                maxlength="300"
                >
          <div class="title-button-bar">
            <devtools-button
              @click=${s.onEditTitleButtonClick}
              .data=${{disabled:!t,variant:"toolbar",iconName:"edit",title:u(p.editTitle),jslogContext:"edit-title"}}
            ></devtools-button>
          </div>
        </div>
        ${s.isTitleInvalid?l`<div class="title-input-error-text">
          ${u(p.requiredTitleError)}
        </div>`:$.nothing}
      </div>
      ${!s.isRecording&&s.replayAllowed?l`<div class="actions">
              <devtools-button
                @click=${s.onMeasurePerformanceClick}
                .data=${{disabled:s.replayState.isPlaying,variant:"outlined",iconName:"performance",title:u(p.performancePanel),jslogContext:"measure-performance"}}
              >
                ${u(p.performancePanel)}
              </devtools-button>
              <div class="separator"></div>
              ${Hs(s)}
            </div>`:$.nothing}
    </div>`}var as=(s,e,t)=>{let o={wrapper:!0,"is-recording":s.isRecording,"is-playing":s.replayState.isPlaying,"was-successful":s.lastReplayResult==="Success","was-failure":s.lastReplayResult==="Failure"},i=s.recordingTogglingInProgress?u(p.recordingIsBeingStopped):u(p.endRecording);$.render(l`
    <style>${G.inspectorCommonStyles}</style>
    <style>${Ut}</style>
    <style>${ns.textInputStyles}</style>
    <div @click=${s.onWrapperClick} class=${$.Directives.classMap(o)}>
      <div class="recording-view main">
        ${_s(s)}
        ${s.extensionDescriptor?l`
            <devtools-recorder-extension-view .descriptor=${s.extensionDescriptor}></devtools-recorder-extension-view>`:l`
          ${qs(s)}
          ${zs(s,e)}
        `}
        ${s.isRecording?l`<div class="footer">
          <div class="controls">
            <devtools-widget
              class="control-button"
              ${Oe(X,{label:i,shape:"square",disabled:s.recordingTogglingInProgress,onClick:s.onRecordingFinished})}
              jslog=${h.toggle("toggle-recording").track({click:!0})}
              title=${O.Tooltip.getTooltipForActions(i,"chrome-recorder.start-recording")}
            >
            </devtools-widget>
          </div>
        </div>`:$.nothing}
      </div>
    </div>
  `,t)},gt=class extends G.Widget.Widget{replayState={isPlaying:!1,isPausedOnBreakpoint:!1};isRecording=!1;recordingTogglingInProgress=!1;recording={title:"",steps:[]};currentStep;currentError;sections=[];settings;lastReplayResult;replayAllowed=!1;breakpointIndexes=new Set;extensionConverters=[];replayExtensions;extensionDescriptor;addAssertion;abortReplay;recordingFinished;playRecording;networkConditionsChanged;timeoutChanged;titleChanged;#t;get recorderSettings(){return this.#t}set recorderSettings(e){this.#t=e,this.#l=this.recorderSettings?.preferredCopyFormat??this.#e[0]?.getId(),this.#b()}#e=[];get builtInConverters(){return this.#e}set builtInConverters(e){this.#e=e,this.#l=this.recorderSettings?.preferredCopyFormat??this.#e[0]?.getId(),this.#b()}#s=!1;#o=null;#i=!1;#a=!1;#n="";#l="";#d;#c;#p=this.#L.bind(this);#u;#r={};constructor(e,t){super(e,{useShadowDom:!0}),this.#u=t||as}performUpdate(){let e=[...this.builtInConverters||[],...this.extensionConverters||[]].find(t=>t.getId()===this.#l)??this.builtInConverters[0];this.#u({breakpointIndexes:this.breakpointIndexes,builtInConverters:this.builtInConverters,converterId:this.#l,converterName:e?.getFormatName(),currentError:this.currentError??null,currentStep:this.currentStep??null,editorState:this.#c??null,extensionConverters:this.extensionConverters,extensionDescriptor:this.extensionDescriptor,isRecording:this.isRecording,isTitleInvalid:this.#s,lastReplayResult:this.lastReplayResult??null,recorderSettings:this.#t??null,recording:this.recording,recordingTogglingInProgress:this.recordingTogglingInProgress,replayAllowed:this.replayAllowed,replayExtensions:this.replayExtensions??[],replaySettingsExpanded:this.#i,replayState:this.replayState,sections:this.sections,selectedStep:this.#o??null,settings:this.settings??null,showCodeView:this.#a,onAddAssertion:()=>{this.addAssertion?.()},onRecordingFinished:()=>{this.recordingFinished?.()},getSectionState:this.#g.bind(this),getStepState:this.#h.bind(this),onAbortReplay:()=>{this.abortReplay?.()},onMeasurePerformanceClick:this.#M.bind(this),onTogglePlaying:(t,o)=>{this.playRecording?.({targetPanel:"chrome-recorder",speed:t,extension:o})},onCodeFormatChange:this.#U.bind(this),onCopyStep:this.#R.bind(this),onEditTitleButtonClick:this.#T.bind(this),onNetworkConditionsChange:this.#$.bind(this),onReplaySettingsKeydown:this.#v.bind(this),onSelectMenuLabelClick:this.#I.bind(this),onStepClick:this.#f.bind(this),onStepHover:this.#m.bind(this),onTimeoutInput:this.#k.bind(this),onTitleBlur:this.#E.bind(this),onTitleInputKeyDown:this.#C.bind(this),onToggleReplaySettings:this.#w.bind(this),onWrapperClick:this.#y.bind(this),showCodeToggle:this.showCodeToggle.bind(this)},this.#r,this.contentElement)}wasShown(){super.wasShown(),document.addEventListener("copy",this.#p),this.performUpdate()}willHide(){super.willHide(),document.removeEventListener("copy",this.#p)}scrollToBottom(){let e=this.contentElement?.querySelector(".sections");e&&(e.scrollTop=e.scrollHeight)}#h(e){if(!this.currentStep)return"default";if(e===this.currentStep)return this.currentError?"error":this.replayState?.isPlaying?this.replayState?.isPausedOnBreakpoint?"stopped":"current":"success";let t=this.recording.steps.indexOf(this.currentStep);return t===-1?"default":this.recording.steps.indexOf(e)<t?"success":"outstanding"}#g(e){let t=this.currentStep;if(!t)return"default";let o=this.sections.find(n=>n.steps.includes(t));if(!o&&this.currentError)return"error";if(e===o)return"success";let i=this.sections.indexOf(o),r=this.sections.indexOf(e);return i>=r?"success":"outstanding"}#m=e=>{let t="type"in e?e:e.causingStep;!t||this.#o||this.#x(t)};#f(e){let t="type"in e?e:e.causingStep||null;this.#o!==t&&(this.#o=t,this.performUpdate(),t&&this.#x(t,!0))}#y(){this.#o&&(this.#o=null,this.performUpdate())}#v(e){e.key==="Enter"&&(e.preventDefault(),this.#w(e))}#w(e){e.stopPropagation(),this.#i=!this.#i,this.performUpdate()}#$(e){let t=e.target;if(t instanceof HTMLSelectElement){let o=ht.find(i=>i.i18nTitleKey===t.value);this.networkConditionsChanged?.(o?.i18nTitleKey===V.NetworkManager.NoThrottlingConditions.i18nTitleKey?void 0:o)}}#k(e){let t=e.target;if(!t.checkValidity()){t.reportValidity();return}this.timeoutChanged?.(Number(t.value))}#E=e=>{let o=e.target.value.trim();if(!o){this.#s=!0,this.performUpdate();return}this.titleChanged?.(o)};#C=e=>{switch(e.code){case"Escape":case"Enter":e.target.blur(),e.stopPropagation();break}};#T=()=>{let e=this.contentElement.querySelector("#title-input");if(!e)throw new Error("Missing #title-input");e.focus()};#I=e=>{let t=e.target;t.matches(".wrapping-label")&&t.querySelector("devtools-select-menu")?.click()};async#S(e){let t=[...this.builtInConverters,...this.extensionConverters].find(i=>i.getId()===this.recorderSettings?.preferredCopyFormat);if(t||(t=this.builtInConverters[0]),!t)throw new Error("No default converter found");let o="";e?o=await t.stringifyStep(e):this.recording&&([o]=await t.stringify(this.recording)),je.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(o)}#R(e){e.stopPropagation(),this.#S(e.step)}async#L(e){e.target===document.body&&(e.preventDefault(),await this.#S(this.#o),je.userMetrics.keyboardShortcutFired("chrome-recorder.copy-recording-or-step"))}#M(e){e.stopPropagation(),this.playRecording?.({targetPanel:"timeline",speed:"normal"})}showCodeToggle=()=>{this.#a=!this.#a,this.#a?G.ARIAUtils.LiveAnnouncer.alert(u(p.codeSidebarOpened)):G.ARIAUtils.LiveAnnouncer.alert(u(p.codeSidebarClosed)),this.#b()};#b=async()=>{if(!this.recording)return;let e=[...this.builtInConverters||[],...this.extensionConverters||[]].find(n=>n.getId()===this.#l)??this.builtInConverters[0];if(!e)return;let[t,o]=await e.stringify(this.recording);this.#n=t,this.#d=o,this.#d?.shift();let i=e.getMediaType(),r=i?await rs.CodeHighlighter.languageFromMIME(i):null;this.#c=ae.EditorState.create({doc:this.#n,extensions:[Fe.Config.baseConfiguration(this.#n),ae.EditorState.readOnly.of(!0),ae.EditorView.lineWrapping,r||[]]}),this.performUpdate(),this.contentElement.dispatchEvent(new Event("code-generated"))};#x=(e,t=!1)=>{if(!this.#d)return;let o=this.recording.steps.indexOf(e);if(o===-1)return;let i=this.#d[o*2],r=this.#d[o*2+1];this.#r.highlightLinesInEditor?.(i,r,t)};#U=e=>{this.#l=e.itemValue,this.recorderSettings&&(this.recorderSettings.preferredCopyFormat=e.itemValue),this.#b()}};export{wt as ControlButton,$t as CreateRecordingView,Rt as RecordingListView,ls as RecordingView,Ot as ReplaySection,Kt as SelectorPicker,Jt as StepEditor,is as StepView,ss as TimelineSection};
//# sourceMappingURL=components.js.map
