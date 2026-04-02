var gr=Object.defineProperty;var L=(i,e)=>{for(var t in e)gr(i,t,{get:e[t],enumerable:!0})};var Fs={};L(Fs,{Breadcrumbs:()=>Ui,flattenBreadcrumbs:()=>Ei});import*as Di from"./../../../services/trace_bounds/trace_bounds.js";function Ei(i){let e=[i],t=i;for(;t.child!==null;){let s=t.child;s!==null&&(e.push(s),t=s)}return e}var Ui=class{initialBreadcrumb;activeBreadcrumb;constructor(e){this.initialBreadcrumb={window:e,child:null};let t=this.initialBreadcrumb;for(;t.child!==null;)t=t.child;this.activeBreadcrumb=t}add(e){if(!this.isTraceWindowWithinTraceWindow(e,this.activeBreadcrumb.window))throw new Error("Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow");let t={window:e,child:null};return this.activeBreadcrumb.child=t,this.setActiveBreadcrumb(t,{removeChildBreadcrumbs:!1,updateVisibleWindow:!0}),t}isTraceWindowWithinTraceWindow(e,t){return e.min>=t.min&&e.max<=t.max&&!(e.min===t.min&&e.max===t.max)}setInitialBreadcrumbFromLoadedModifications(e){this.initialBreadcrumb=e;let t=e;for(;t.child!==null;)t=t.child;this.setActiveBreadcrumb(t,{removeChildBreadcrumbs:!1,updateVisibleWindow:!0})}setActiveBreadcrumb(e,t){t.removeChildBreadcrumbs&&(e.child=null),this.activeBreadcrumb=e,Di.TraceBounds.BoundsManager.instance().setMiniMapBounds(e.window),t.updateVisibleWindow&&Di.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(e.window)}};var _s={};L(_s,{BreadcrumbActivatedEvent:()=>Xe,BreadcrumbsUI:()=>Xt});import*as Ge from"./../../../core/i18n/i18n.js";import*as Os from"./../../../models/trace/trace.js";import*as Bs from"./../../../ui/components/helpers/helpers.js";import*as Vs from"./../../../ui/legacy/legacy.js";import*as Hi from"./../../../ui/lit/lit.js";import*as Gt from"./../../../ui/visual_logging/visual_logging.js";var As=`.breadcrumbs{display:none;align-items:center;height:29px;padding:3px;overflow:scroll hidden}.breadcrumbs::-webkit-scrollbar{display:none}.breadcrumb{padding:2px 6px;border-radius:4px}.breadcrumb:hover{background-color:var(--sys-color-state-hover-on-subtle)}.range{font-size:12px;white-space:nowrap}.active-breadcrumb{font-weight:bold;color:var(--app-color-active-breadcrumb)}
/*# sourceURL=${import.meta.resolve("./breadcrumbsUI.css")} */`;var{render:pr,html:jt}=Hi,Ri={activateBreadcrumb:"Activate breadcrumb",removeChildBreadcrumbs:"Remove child breadcrumbs"},hr=Ge.i18n.registerUIStrings("panels/timeline/components/BreadcrumbsUI.ts",Ri),zs=Ge.i18n.getLocalizedString.bind(void 0,hr),Xe=class i extends Event{breadcrumb;childBreadcrumbsRemoved;static eventName="breadcrumbactivated";constructor(e,t){super(i.eventName),this.breadcrumb=e,this.childBreadcrumbsRemoved=t}},Xt=class extends HTMLElement{#i=this.attachShadow({mode:"open"});#e=null;#t=null;set data(e){this.#e=e.initialBreadcrumb,this.#t=e.activeBreadcrumb,Bs.ScheduledRender.scheduleRender(this,this.#l)}#s(e){this.#t=e,this.dispatchEvent(new Xe(e))}#n(){let e=this.#i.querySelector(".breadcrumbs");e&&(e.style.display="flex",requestAnimationFrame(()=>{e.scrollWidth-e.clientWidth>0&&requestAnimationFrame(()=>{e.scrollLeft=e.scrollWidth-e.clientWidth})}))}#o(e,t){let s=new Vs.ContextMenu.ContextMenu(e);s.defaultSection().appendItem(zs(Ri.activateBreadcrumb),()=>{this.dispatchEvent(new Xe(t))}),s.defaultSection().appendItem(zs(Ri.removeChildBreadcrumbs),()=>{this.dispatchEvent(new Xe(t,!0))}),s.show()}#a(e,t){let s=Os.Helpers.Timing.microToMilli(e.window.range);return jt`
          <div class="breadcrumb" @contextmenu=${o=>this.#o(o,e)} @click=${()=>this.#s(e)}
          jslog=${Gt.item("timeline.breadcrumb-select").track({click:!0,resize:!0})}>
           <span class="${e===this.#t?"active-breadcrumb":""} range">
            ${t===0?`Full range (${Ge.TimeUtilities.preciseMillisToString(s,2)})`:`${Ge.TimeUtilities.preciseMillisToString(s,2)}`}
            </span>
          </div>
          ${e.child!==null?jt`
            <devtools-icon name="chevron-right" class="medium">`:""}
      `}#l(){let e=jt`
      <style>${As}</style>
      ${this.#e===null?Hi.nothing:jt`<div class="breadcrumbs" jslog=${Gt.section("breadcrumbs")}>
        ${Ei(this.#e).map((t,s)=>this.#a(t,s))}
      </div>`}
    `;pr(e,this.#i,{host:this}),this.#e?.child&&this.#n()}};customElements.define("devtools-breadcrumbs-ui",Xt);var js={};L(js,{CPUThrottlingSelector:()=>vt,DEFAULT_VIEW:()=>Ks});import"./../../../ui/kit/kit.js";import"./../../../ui/components/menus/menus.js";import*as Yt from"./../../../core/common/common.js";import*as Ni from"./../../../core/i18n/i18n.js";import*as we from"./../../../core/sdk/sdk.js";import*as qs from"./../../../ui/legacy/legacy.js";import*as Fi from"./../../../ui/lit/lit.js";import*as Jt from"./../../../ui/visual_logging/visual_logging.js";import*as Ye from"./../../mobile_throttling/mobile_throttling.js";var Ws=`@scope to (devtools-widget > *){:scope{display:flex;align-items:center;max-width:100%;height:20px}devtools-icon[name="info"]{margin-left:var(--sys-size-3);width:var(--sys-size-8);height:var(--sys-size-8)}devtools-select-menu{min-width:160px;max-width:100%;height:20px}}
/*# sourceURL=${import.meta.resolve("./cpuThrottlingSelector.css")} */`;var{render:fr,html:ft}=Fi,xe={cpu:"CPU: {PH1}",cpuThrottling:"CPU throttling: {PH1}",recommendedThrottling:"{PH1} \u2013 recommended",recommendedThrottlingReason:"Consider changing setting to simulate real user environments",calibrate:"Calibrate\u2026",recalibrate:"Recalibrate\u2026",labelCalibratedPresets:"Calibrated presets"},vr=Ni.i18n.registerUIStrings("panels/timeline/components/CPUThrottlingSelector.ts",xe),He=Ni.i18n.getLocalizedString.bind(void 0,vr),Ks=(i,e,t)=>{let s;i.recommendedOption&&i.currentOption===we.CPUThrottlingManager.NoThrottlingOption&&(s=ft`<devtools-icon
        title=${He(xe.recommendedThrottlingReason)}
        name=info></devtools-icon>`);let o=i.currentOption.title(),n=i.throttling.low||i.throttling.mid,r=He(n?xe.recalibrate:xe.calibrate),a=ft`
    <style>${Ws}</style>
    <devtools-select-menu
          @selectmenuselected=${i.onMenuItemSelected}
          .showDivider=${!0}
          .showArrow=${!0}
          .sideButton=${!1}
          .showSelectedItem=${!0}
          .jslogContext=${"cpu-throttling"}
          .buttonTitle=${He(xe.cpu,{PH1:o})}
          .title=${He(xe.cpuThrottling,{PH1:o})}
        >
        ${i.groups.map(l=>ft`
            <devtools-menu-group .name=${l.name} .title=${l.name}>
              ${l.items.map(c=>{let u=c===i.recommendedOption?He(xe.recommendedThrottling,{PH1:c.title()}):c.title(),g=c.rate();return ft`
                  <devtools-menu-item
                    .value=${c.calibratedDeviceType??g}
                    .selected=${i.currentOption===c}
                    .disabled=${g===0}
                    .title=${u}
                    jslog=${Jt.item(c.jslogContext).track({click:!0})}
                  >
                    ${u}
                  </devtools-menu-item>
                `})}
              ${l.name==="Calibrated presets"?ft`<devtools-menu-item
                .value=${-1}
                .title=${r}
                jslog=${Jt.action("cpu-throttling-selector-calibrate").track({click:!0})}
                @click=${i.onCalibrateClick}
              >
                ${r}
              </devtools-menu-item>`:Fi.nothing}
            </devtools-menu-group>`)}
    </devtools-select-menu>
    ${s}
  `;fr(a,t)},vt=class extends qs.Widget.Widget{#i;#e=null;#t=[];#s;#n;constructor(e,t=Ks){super(e),this.#i=we.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption(),this.#s=Yt.Settings.Settings.instance().createSetting("calibrated-cpu-throttling",{},"Global"),this.#c(),this.#n=t}set recommendedOption(e){this.#e=e,this.requestUpdate()}wasShown(){super.wasShown(),we.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener("RateChanged",this.#o,this),this.#s.addChangeListener(this.#a,this),this.#o()}willHide(){super.willHide(),this.#s.removeChangeListener(this.#a,this),we.CPUThrottlingManager.CPUThrottlingManager.instance().removeEventListener("RateChanged",this.#o,this)}#o(){this.#i=we.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption(),this.requestUpdate()}#a(){this.#c(),this.requestUpdate()}#l(e){let t;if(typeof e.itemValue=="string")e.itemValue==="low-tier-mobile"?t=we.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption:e.itemValue==="mid-tier-mobile"&&(t=we.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption);else{let s=Number(e.itemValue);t=Ye.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.find(o=>!o.calibratedDeviceType&&o.rate()===s)}t&&Ye.ThrottlingManager.throttlingManager().setCPUThrottlingOption(t)}#d(){Yt.Revealer.reveal(this.#s)}#c(){this.#t=[{name:"",items:Ye.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter(e=>!e.calibratedDeviceType)},{name:He(xe.labelCalibratedPresets),items:Ye.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter(e=>e.calibratedDeviceType)}]}async performUpdate(){let e={recommendedOption:this.#e,currentOption:this.#i,groups:this.#t,throttling:this.#s.get(),onMenuItemSelected:this.#l.bind(this),onCalibrateClick:this.#d.bind(this)};this.#n(e,void 0,this.contentElement)}};var lo={};L(lo,{CWVMetrics:()=>bt,getFieldMetrics:()=>ti});import*as Oi from"./../../../core/i18n/i18n.js";import*as so from"./../../../core/platform/platform.js";import*as oo from"./../../../models/crux-manager/crux-manager.js";import*as W from"./../../../models/trace/trace.js";import"./../../../ui/components/buttons/buttons.js";import*as no from"./../../../ui/legacy/legacy.js";import*as pe from"./../../../ui/lit/lit.js";import*as ro from"./../../../ui/visual_logging/visual_logging.js";var Xs=`.metrics{display:grid;align-items:end;grid-template-columns:repeat(3,1fr) 0.5fr;row-gap:5px}.row-border{grid-column:1/5;border-top:var(--sys-size-1) solid var(--sys-color-divider)}.row-label{visibility:hidden;font-size:var(--sys-size-7)}.metrics--field .row-label{visibility:visible}.metrics-row{display:contents}.metric{flex:1;user-select:text;cursor:pointer;background:none;border:none;padding:0;display:block;text-align:left}.metric-value{font-size:var(--sys-size-10)}.metric-value-bad{color:var(--app-color-performance-bad)}.metric-value-ok{color:var(--app-color-performance-ok)}.metric-value-good{color:var(--app-color-performance-good)}.metric-score-unclassified{color:var(--sys-color-token-subtle)}.metric-label{font:var(--sys-typescale-body4-medium)}.number-with-unit{white-space:nowrap;.unit{font-size:14px;padding:0 1px}}.field-mismatch-notice{display:grid;grid-template-columns:auto auto;align-items:center;background-color:var(--sys-color-surface3);margin:var(--sys-size-6) 0;border-radius:var(--sys-shape-corner-extra-small);border:var(--sys-size-1) solid var(--sys-color-divider);h3{margin-block:3px;font:var(--sys-typescale-body4-medium);color:var(--sys-color-on-base);padding:var(--sys-size-5) var(--sys-size-6) 0 var(--sys-size-6)}.field-mismatch-notice__body{padding:var(--sys-size-3) var(--sys-size-6) var(--sys-size-5) var(--sys-size-6)}button{padding:5px;background:unset;border:unset;font:inherit;color:var(--sys-color-primary);text-decoration:underline;cursor:pointer}}
/*# sourceURL=${import.meta.resolve("./cwvMetrics.css")} */`;import"./../../../ui/components/markdown_view/markdown_view.js";import*as Gs from"./../../../models/trace/trace.js";import*as Ys from"./../../../third_party/marked/marked.js";import*as yr from"./../../../ui/lit/lit.js";var{html:br}=yr;function Js(i){return i.activeCategory===Gs.Insights.Types.InsightCategory.ALL||i.activeCategory===i.insightCategory}function Zt(i){let t={tokens:Ys.Marked.lexer(i)};return br`<devtools-markdown-view .data=${t}></devtools-markdown-view>`}import*as ao from"./insights/insights.js";var io={};L(io,{CLS_THRESHOLDS:()=>tt,INP_THRESHOLDS:()=>it,LCP_THRESHOLDS:()=>ei,NetworkCategory:()=>S,NumberWithUnit:()=>Qe,colorForNetworkCategory:()=>to,colorForNetworkRequest:()=>et,determineCompareRating:()=>yt,isFieldWorseThanLocal:()=>zi,networkResourceCategory:()=>Qt,rateMetric:()=>Se,renderMetricValue:()=>ne});import*as Ze from"./../../../core/i18n/i18n.js";import*as Je from"./../../../core/platform/platform.js";import*as Qs from"./../../../ui/legacy/theme_support/theme_support.js";import*as eo from"./../../../ui/visual_logging/visual_logging.js";var Ai={fms:"{PH1}[ms]()",fs:"{PH1}[s]()"},wr=Ze.i18n.registerUIStrings("panels/timeline/components/Utils.ts",Ai),Zs=Ze.i18n.getLocalizedString.bind(void 0,wr),S;(function(i){i.DOC="Doc",i.CSS="CSS",i.JS="JS",i.FONT="Font",i.IMG="Img",i.MEDIA="Media",i.WASM="Wasm",i.OTHER="Other"})(S||(S={}));function Qt(i){let{mimeType:e}=i.args.data;switch(i.args.data.resourceType){case"Document":return S.DOC;case"Stylesheet":return S.CSS;case"Image":return S.IMG;case"Media":return S.MEDIA;case"Font":return S.FONT;case"Script":case"WebSocket":return S.JS;default:return e===void 0?S.OTHER:e.endsWith("/css")?S.CSS:e.endsWith("javascript")?S.JS:e.startsWith("image/")?S.IMG:e.startsWith("audio/")||e.startsWith("video/")?S.MEDIA:e.startsWith("font/")||e.includes("font-")?S.FONT:e==="application/wasm"?S.WASM:e.startsWith("text/")?S.DOC:S.OTHER}}function to(i){let e="--app-color-system";switch(i){case S.DOC:e="--app-color-doc";break;case S.JS:e="--app-color-scripting";break;case S.CSS:e="--app-color-css";break;case S.IMG:e="--app-color-image";break;case S.MEDIA:e="--app-color-media";break;case S.FONT:e="--app-color-font";break;case S.WASM:e="--app-color-wasm";break;case S.OTHER:default:e="--app-color-system";break}return Qs.ThemeSupport.instance().getComputedValue(e)}function et(i){let e=Qt(i);return to(e)}var ei=[2500,4e3],tt=[.1,.25],it=[200,500];function Se(i,e){return i<=e[0]?"good":i<=e[1]?"needs-improvement":"poor"}function ne(i,e,t,s,o){let n=document.createElement("span");if(n.classList.add("metric-value"),e===void 0)return n.classList.add("waiting"),n.textContent="-",n;n.textContent=s(e);let r=Se(e,t);return n.classList.add(r),n.setAttribute("jslog",`${eo.section(i)}`),o?.dim&&n.classList.add("dim"),n}var Qe;(function(i){function e(o){let n=o.indexOf("["),r=n!==-1&&o.indexOf("]",n),a=r&&o.indexOf("(",r),l=a&&o.indexOf(")",a);if(!l||l===-1)return null;let c=o.substring(0,n),u=o.substring(n+1,r),g=o.substring(l+1);return{firstPart:c,unitPart:u,lastPart:g}}i.parse=e;function t(o){let n=document.createElement("span");n.classList.add("number-with-unit");let r=Je.Timing.microSecondsToMilliSeconds(o),a=Je.Timing.milliSecondsToSeconds(r),l=Zs(Ai.fs,{PH1:a.toFixed(2)}),c=e(l);if(!c)return n.textContent=Ze.TimeUtilities.formatMicroSecondsAsSeconds(o),{text:l,element:n};let{firstPart:u,unitPart:g,lastPart:h}=c;return u&&n.append(u),n.createChild("span","unit").textContent=g,h&&n.append(h),{text:n.textContent,element:n}}i.formatMicroSecondsAsSeconds=t;function s(o,n=0){let r=document.createElement("span");r.classList.add("number-with-unit");let a=Je.Timing.microSecondsToMilliSeconds(o),l=Zs(Ai.fms,{PH1:a.toFixed(n)}),c=e(l);if(!c)return r.textContent=Ze.TimeUtilities.formatMicroSecondsAsMillisFixed(o),{text:l,element:r};let{firstPart:u,unitPart:g,lastPart:h}=c;return u&&r.append(u),r.createChild("span","unit").textContent=g,h&&r.append(h),{text:r.textContent,element:r}}i.formatMicroSecondsAsMillisFixed=s})(Qe||(Qe={}));function yt(i,e,t){let s,o;switch(i){case"LCP":s=ei,o=1e3;break;case"CLS":s=tt,o=.1;break;case"INP":s=it,o=200;break;default:Je.assertNever(i,`Unknown metric: ${i}`)}let n=Se(e,s),r=Se(t,s);return n==="good"&&r==="good"?"similar":e-t>o?"worse":t-e>o?"better":"similar"}function zi(i,e){return i.lcp!==void 0&&e.lcp!==void 0&&yt("LCP",i.lcp,e.lcp)==="better"||i.inp!==void 0&&e.inp!==void 0&&yt("LCP",i.inp,e.inp)==="better"}var{html:Te}=pe.StaticHtml,ge={metricScore:"{PH1}: {PH2} {PH3} score",metricScoreUnavailable:"{PH1}: unavailable",fieldScoreLabel:"Field ({PH1})",urlOption:"URL",originOption:"Origin",dismissTitle:"Dismiss",fieldMismatchTitle:"Field & local metrics mismatch",fieldMismatchNotice:"There are many reasons why local and field metrics [may not match](https://web.dev/articles/lab-and-field-data-differences). Adjust [throttling settings and device emulation](https://developer.chrome.com/docs/devtools/device-mode) to analyze traces more similar to the average user's environment."},xr=Oi.i18n.registerUIStrings("panels/timeline/components/CWVMetrics.ts",ge),ke=Oi.i18n.getLocalizedString.bind(void 0,xr);function Sr(i,e){if(!i||!e)return null;let t=i.insights?.get(e);if(!t)return null;let s=W.Insights.Common.getLCP(t),o=W.Insights.Common.getCLS(t),n=W.Insights.Common.getINP(t);return{lcp:s,cls:o,inp:n}}function ti(i,e){if(!i||!i.metadata?.cruxFieldData||!e)return null;let t=i.insights?.get(e);if(!t)return null;let s=null;try{s=oo.CrUXManager.instance().getSelectedScope()}catch{}let o=W.Insights.Common.getFieldMetricsForInsightSet(t,i.metadata,s);return o||null}var Tr=(i,e,t)=>{let{parsedTrace:s,insightSetKey:o,didDismissFieldMismatchNotice:n,onDismisFieldMismatchNotice:r,onClickMetric:a}=i,l=Sr(s,o),c=ti(s,o),u={lcp:l?.lcp?.value!==void 0?W.Helpers.Timing.microToMilli(l?.lcp.value):void 0,inp:l?.inp?.value!==void 0?W.Helpers.Timing.microToMilli(l?.inp.value):void 0},g=c&&{lcp:c.lcp?.value!==void 0?W.Helpers.Timing.microToMilli(c.lcp.value):void 0,inp:c.inp?.value!==void 0?W.Helpers.Timing.microToMilli(c.inp.value):void 0},h=!n&&!!g&&zi(u,g);function w(se,oe,Kt){let Ee,Re,be;if(oe===null)Ee=Re="-",be="unclassified";else if(se==="LCP"){let ht=oe,{text:Pi,element:Mi}=Qe.formatMicroSecondsAsSeconds(ht);Ee=Pi,Re=Mi,be=W.Handlers.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(ht)}else if(se==="CLS")Ee=Re=oe?oe.toFixed(2):"0",be=W.Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(oe);else if(se==="INP"){let ht=oe,{text:Pi,element:Mi}=Qe.formatMicroSecondsAsMillisFixed(ht);Ee=Pi,Re=Mi,be=W.Handlers.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(ht)}else so.TypeScriptUtilities.assertNever(se,`Unexpected metric ${se}`);let pt=oe!==null?ke(ge.metricScore,{PH1:se,PH2:Ee,PH3:be}):ke(ge.metricScoreUnavailable,{PH1:se});return Te`
      <button class="metric"
        @click=${Kt?a.bind(Kt):null}
        title=${pt}
        aria-label=${pt}
      >
        <div class="metric-value metric-value-${be}">${Re}</div>
      </button>
    `}let T=w("LCP",l?.lcp?.value??null,l?.lcp?.event??null),f=w("INP",l?.inp?.value??null,l?.inp?.event??null),K=w("CLS",l?.cls?.value??null,l?.cls?.worstClusterEvent??null),U=Te`
    <div class="metrics-row">
      <span>${T}</span>
      <span>${f}</span>
      <span>${K}</span>
      <span class="row-label">Local</span>
    </div>
    ${!c&&i.skipBottomBorder?pe.nothing:Te`<span class="row-border"></span>`}
  `,M;if(c){let{lcp:se,inp:oe,cls:Kt}=c,Ee=w("LCP",se?.value??null,null),Re=w("INP",oe?.value??null,null),be=w("CLS",Kt?.value??null,null),pt=ke(ge.originOption);(se?.pageScope==="url"||oe?.pageScope==="url")&&(pt=ke(ge.urlOption)),M=Te`
      <div class="metrics-row">
        <span>${Ee}</span>
        <span>${Re}</span>
        <span>${be}</span>
        <span class="row-label">${ke(ge.fieldScoreLabel,{PH1:pt})}</span>
      </div>
      ${i.skipBottomBorder?pe.nothing:Te`<span class="row-border"></span>`}
    `}let y;h&&(y=Te`
      <div class="field-mismatch-notice" jslog=${ro.section("timeline.insights.field-mismatch")}>
        <h3>${ke(ge.fieldMismatchTitle)}</h3>
        <devtools-button
          title=${ke(ge.dismissTitle)}
          .iconName=${"cross"}
          .variant=${"icon"}
          .jslogContext=${"timeline.insights.dismiss-field-mismatch"}
          @click=${r}
        ></devtools-button>
        <div class="field-mismatch-notice__body">${Zt(ke(ge.fieldMismatchNotice))}</div>
      </div>
    `);let G={metrics:!0,"metrics--field":!!M},Ii=Te`<div class=${pe.Directives.classMap(G)}>
    <div class="metrics-row">
      <span class="metric-label">LCP</span>
      <span class="metric-label">INP</span>
      <span class="metric-label">CLS</span>
      <span class="row-label"></span>
    </div>
    ${U}
    ${M}
  </div>`;pe.render(Te`
    <style>${Xs}</style>
    ${Ii}
    ${y}
  `,t)},bt=class extends no.Widget.Widget{#i;#e={insightSetKey:null,parsedTrace:null};#t=!1;#s=!1;constructor(e,t=Tr){super(e,{useShadowDom:!0}),this.#i=t}set data(e){this.#e=e,this.requestUpdate()}get skipBottomBorder(){return this.#s}set skipBottomBorder(e){e!==this.#s&&(this.#s=e,this.requestUpdate())}#n(e){this.element.dispatchEvent(new ao.EventRef.EventReferenceClick(e))}#o(){this.#t=!0,this.requestUpdate()}performUpdate(){let{parsedTrace:e,insightSetKey:t}=this.#e;if(!e?.insights||!t||!(e.insights instanceof Map)||!e.insights.get(t))return;let o={parsedTrace:e,insightSetKey:t,didDismissFieldMismatchNotice:this.#t,onDismisFieldMismatchNotice:this.#o.bind(this),onClickMetric:this.#n.bind(this),skipBottomBorder:this.#s};this.#i(o,void 0,this.contentElement)}};var mo={};L(mo,{buildRowsForWebSocketEvent:()=>Cr,buildWarningElementsForEvent:()=>kr,generateInvalidationsList:()=>Lr});import*as Le from"./../../../core/i18n/i18n.js";import*as co from"./../../../core/platform/platform.js";import*as Q from"./../../../models/trace/trace.js";import*as ii from"./../../../ui/i18n/i18n.js";import{Link as Bi}from"./../../../ui/kit/kit.js";var Y={forcedReflow:"Forced reflow",sIsALikelyPerformanceBottleneck:"{PH1} is a likely performance bottleneck.",idleCallbackExecutionExtended:"Idle callback execution extended beyond deadline by {PH1}",sTookS:"{PH1} took {PH2}.",longTask:"Long task",longInteractionINP:"Long interaction",sIsLikelyPoorPageResponsiveness:"{PH1} is indicating poor page responsiveness.",websocketProtocol:"WebSocket protocol",webSocketBytes:"{PH1} byte(s)",webSocketDataLength:"Data length"},si=Le.i18n.registerUIStrings("panels/timeline/components/DetailsView.ts",Y),Ce=Le.i18n.getLocalizedString.bind(void 0,si);function kr(i,e){let t=e.data.Warnings.perEvent.get(i),s=[];if(!t)return s;for(let o of t){let n=Q.Helpers.Timing.microToMilli(Q.Types.Timing.Micro(i.dur||0)),r=document.createElement("span");switch(o){case"FORCED_REFLOW":{let a=Bi.create("https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts",Ce(Y.forcedReflow),void 0,"forced-reflow");r.appendChild(ii.getFormatLocalizedString(si,Y.sIsALikelyPerformanceBottleneck,{PH1:a}));break}case"IDLE_CALLBACK_OVER_TIME":{if(!Q.Types.Events.isFireIdleCallback(i))break;let a=Le.TimeUtilities.millisToString((n||0)-i.args.data.allottedMilliseconds,!0);r.textContent=Ce(Y.idleCallbackExecutionExtended,{PH1:a});break}case"LONG_TASK":{let a=Bi.create("https://web.dev/optimize-long-tasks/",Ce(Y.longTask),void 0,"long-tasks");r.appendChild(ii.getFormatLocalizedString(si,Y.sTookS,{PH1:a,PH2:Le.TimeUtilities.millisToString(n||0,!0)}));break}case"LONG_INTERACTION":{let a=Bi.create("https://web.dev/inp",Ce(Y.longInteractionINP),void 0,"long-interaction");r.appendChild(ii.getFormatLocalizedString(si,Y.sIsLikelyPoorPageResponsiveness,{PH1:a}));break}default:co.assertNever(o,`Unhandled warning type ${o}`)}s.push(r)}return s}function Cr(i,e){let t=[],s=e.data.Initiators.eventToInitiator.get(i);return s&&Q.Types.Events.isWebSocketCreate(s)?(t.push({key:Le.i18n.lockedString("URL"),value:s.args.data.url}),s.args.data.websocketProtocol&&t.push({key:Ce(Y.websocketProtocol),value:s.args.data.websocketProtocol})):Q.Types.Events.isWebSocketCreate(i)&&(t.push({key:Le.i18n.lockedString("URL"),value:i.args.data.url}),i.args.data.websocketProtocol&&t.push({key:Ce(Y.websocketProtocol),value:i.args.data.websocketProtocol})),Q.Types.Events.isWebSocketTransfer(i)&&i.args.data.dataLength&&t.push({key:Ce(Y.webSocketDataLength),value:`${Ce(Y.webSocketBytes,{PH1:i.args.data.dataLength})}`}),t}function Lr(i){let e={},t=new Set;for(let s of i){t.add(s.args.data.nodeId);let o=s.args.data.reason||"unknown";if(o==="unknown"&&Q.Types.Events.isScheduleStyleInvalidationTracking(s)&&s.args.data.invalidatedSelectorId)switch(s.args.data.invalidatedSelectorId){case"attribute":o="Attribute",s.args.data.changedAttribute&&(o+=` (${s.args.data.changedAttribute})`);break;case"class":o="Class",s.args.data.changedClass&&(o+=` (${s.args.data.changedClass})`);break;case"id":o="Id",s.args.data.changedId&&(o+=` (${s.args.data.changedId})`);break}if(o==="PseudoClass"&&Q.Types.Events.isStyleRecalcInvalidationTracking(s)&&s.args.data.extraData&&(o+=s.args.data.extraData),o==="Attribute"&&Q.Types.Events.isStyleRecalcInvalidationTracking(s)&&s.args.data.extraData&&(o+=` (${s.args.data.extraData})`),o==="StyleInvalidator")continue;let n=e[o]||[];n.push(s),e[o]=n}return{groupedByReason:e,backendNodeIds:t}}var po={};L(po,{ExportTraceOptions:()=>ni});import"./../../../ui/kit/kit.js";import"./../../../ui/components/tooltips/tooltips.js";import"./../../../ui/components/buttons/buttons.js";import*as wt from"./../../../core/common/common.js";import*as ri from"./../../../core/host/host.js";import*as _i from"./../../../core/i18n/i18n.js";import"./../../../ui/components/buttons/buttons.js";import"./../../../ui/components/dialogs/dialogs.js";import*as Vi from"./../../../ui/components/helpers/helpers.js";import*as Ne from"./../../../ui/legacy/legacy.js";import*as re from"./../../../ui/lit/lit.js";var uo=`.export-trace-options-content{max-width:var(--sys-size-36)}.export-trace-options-row{display:flex;devtools-checkbox{flex:auto}devtools-button{height:24px}.export-trace-explanation{flex:1;min-width:var(--sys-size-25)}}.export-trace-options-row-last{align-items:center}.info-tooltip-container{max-width:var(--sys-size-28);white-space:normal}devtools-link{color:var(--sys-color-primary);text-decoration-line:underline}
/*# sourceURL=${import.meta.resolve("./exportTraceOptions.css")} */`;var{html:oi}=re,E={exportTraceOptionsDialogTitle:"Save performance trace ",showExportTraceOptionsDialogTitle:"Save trace\u2026",includeResourceContent:"Include resource content",includeSourcemap:"Include script source maps",includeAnnotations:"Include annotations",shouldCompress:"Compress with gzip",explanation:"Explanation",saveButtonTitle:"Save",resourceContentPrivacyInfo:"Includes the full content of all loaded HTML, CSS, and scripts (except extensions).",sourceMapsContentPrivacyInfo:"Includes available source maps, which may expose authored code.",moreInfoLabel:"Additional information:"},$r=_i.i18n.registerUIStrings("panels/timeline/components/ExportTraceOptions.ts",E),N=_i.i18n.getLocalizedString.bind(void 0,$r),go=new Set(["resource-content","script-source-maps"]),ni=class i extends HTMLElement{#i=this.attachShadow({mode:"open"});#e=null;static#t="export-performance-trace-include-annotations";static#s="export-performance-trace-include-resources";static#n="export-performance-trace-include-sourcemaps";static#o="export-performance-trace-should-compress";#a=wt.Settings.Settings.instance().createSetting(i.#t,!0,"Session");#l=wt.Settings.Settings.instance().createSetting(i.#s,!1,"Session");#d=wt.Settings.Settings.instance().createSetting(i.#n,!1,"Session");#c=wt.Settings.Settings.instance().createSetting(i.#o,!0,"Synced");#r={dialogState:"collapsed",includeAnnotations:this.#a.get(),includeResourceContent:this.#l.get(),includeSourceMaps:this.#d.get(),shouldCompress:this.#c.get()};#m=Ne.UIUtils.CheckboxLabel.create(N(E.includeAnnotations),this.#r.includeAnnotations,void 0,"timeline.export-trace-options.annotations-checkbox");#u=Ne.UIUtils.CheckboxLabel.create(N(E.includeResourceContent),this.#r.includeResourceContent,void 0,"timeline.export-trace-options.resource-content-checkbox");#p=Ne.UIUtils.CheckboxLabel.create(N(E.includeSourcemap),this.#r.includeSourceMaps,void 0,"timeline.export-trace-options.source-maps-checkbox");#f=Ne.UIUtils.CheckboxLabel.create(N(E.shouldCompress),this.#r.shouldCompress,void 0,"timeline.export-trace-options.should-compress-checkbox");set data(e){this.#e=e,this.#v()}set state(e){this.#r=e,this.#a.set(e.includeAnnotations),this.#l.set(e.includeResourceContent),this.#d.set(e.includeSourceMaps),this.#c.set(e.shouldCompress),this.#v()}get state(){return this.#r}updateContentVisibility(e){this.state={...this.#r,displayAnnotationsCheckbox:e.annotationsExist,displayResourceContentCheckbox:!0,displaySourceMapsCheckbox:!0}}#v(){Vi.ScheduledRender.scheduleRender(this,this.#x)}#y(e,t){let s=Object.assign({},this.#r,{dialogState:"expanded"});switch(e){case this.#m:{s.includeAnnotations=t;break}case this.#u:{s.includeResourceContent=t,s.includeResourceContent||(s.includeSourceMaps=!1);break}case this.#p:{s.includeSourceMaps=t;break}case this.#f:{s.shouldCompress=t;break}}this.state=s}#b(e){return e==="script-source-maps"?N(E.moreInfoLabel)+" "+N(E.sourceMapsContentPrivacyInfo):e==="resource-content"?N(E.moreInfoLabel)+" "+N(E.resourceContentPrivacyInfo):""}#h(e,t,s,o){return Ne.Tooltip.Tooltip.install(t,s),t.ariaLabel=s,t.checked=o,t.addEventListener("change",this.#y.bind(this,t,!o),!1),this.#p.disabled=!this.#r.includeResourceContent,oi`
        <div class='export-trace-options-row'>
          ${t}

          ${go.has(e)?oi`
            <devtools-button
              aria-details=${`export-trace-tooltip-${e}`}
              .accessibleLabel=${this.#b(e)}
              class="pen-icon"
              .iconName=${"info"}
              .variant=${"icon"}
              ></devtools-button>
            `:re.nothing}
        </div>
      `}#w(e){return go.has(e)?oi`
    <devtools-tooltip
      variant="rich"
      id=${`export-trace-tooltip-${e}`}
    >
      <div class="info-tooltip-container">
      <p>
        ${e==="resource-content"?N(E.resourceContentPrivacyInfo):re.nothing}
        ${e==="script-source-maps"?N(E.sourceMapsContentPrivacyInfo):re.nothing}
      </p>
      </div>
    </devtools-tooltip>`:re.nothing}#x(){if(!Vi.ScheduledRender.isScheduledRender(this))throw new Error("Export trace options dialog render was not scheduled");let e=oi`
      <style>${uo}</style>
      <devtools-button-dialog class="export-trace-dialog"
      @click=${this.#g.bind(this)}
      .data=${{openOnRender:!1,jslogContext:"timeline.export-trace-options",variant:"toolbar",iconName:"download",disabled:!this.#e?.buttonEnabled,iconTitle:N(E.showExportTraceOptionsDialogTitle),horizontalAlignment:"auto",closeButton:!1,dialogTitle:N(E.exportTraceOptionsDialogTitle),state:this.#r.dialogState,closeOnESC:!0}}>
        <div class='export-trace-options-content'>

          ${this.#r.displayAnnotationsCheckbox?this.#h("annotations",this.#m,N(E.includeAnnotations),this.#r.includeAnnotations):""}
          ${this.#r.displayResourceContentCheckbox?this.#h("resource-content",this.#u,N(E.includeResourceContent),this.#r.includeResourceContent):""}
          ${this.#r.displayResourceContentCheckbox&&this.#r.displaySourceMapsCheckbox?this.#h("script-source-maps",this.#p,N(E.includeSourcemap),this.#r.includeSourceMaps):""}
          ${this.#h("compress-with-gzip",this.#f,N(E.shouldCompress),this.#r.shouldCompress)}
          <div class='export-trace-options-row export-trace-options-row-last'>
            <div class="export-trace-explanation">
              <devtools-link
                href="https://developer.chrome.com/docs/devtools/performance/save-trace"
                class=devtools-link
                .jslogContext=${"save-trace-explanation"}>
                  ${N(E.explanation)}
              </devtools-link>
            </div>
            <devtools-button
                  class="setup-button"
                  data-export-button
                  @click=${this.#T.bind(this)}
                  .data=${{variant:"primary",title:N(E.saveButtonTitle)}}
                >${N(E.saveButtonTitle)}</devtools-button>
                </div>
          ${this.#r.displayResourceContentCheckbox?this.#w("resource-content"):re.nothing}
          ${this.#r.displayResourceContentCheckbox&&this.#r.displaySourceMapsCheckbox?this.#w("script-source-maps"):re.nothing}
        </div>
      </devtools-button-dialog>
    `;re.render(e,this.#i,{host:this})}async#g(){this.state=Object.assign({},this.#r,{dialogState:"expanded"})}async#S(){await this.#e?.onExport({includeResourceContent:this.#r.includeResourceContent,includeSourceMaps:this.#r.includeSourceMaps,addModifications:this.#r.includeAnnotations,shouldCompress:this.#r.shouldCompress}),ri.userMetrics.actionTaken(ri.UserMetrics.Action.PerfPanelTraceExported)}async#T(){await this.#S(),this.state=Object.assign({},this.#r,{dialogState:"collapsed"})}};customElements.define("devtools-perf-export-trace-options",ni);var Lo={};L(Lo,{FieldSettingsDialog:()=>ci,ShowDialog:()=>li});import"./../../../ui/kit/kit.js";import*as di from"./../../../core/i18n/i18n.js";import*as ai from"./../../../models/crux-manager/crux-manager.js";import"./../../../ui/components/buttons/buttons.js";import"./../../../ui/components/dialogs/dialogs.js";import*as he from"./../../../ui/components/helpers/helpers.js";import*as mi from"./../../../ui/components/input/input.js";import*as To from"./../../../ui/i18n/i18n.js";import*as ko from"./../../../ui/legacy/legacy.js";import*as St from"./../../../ui/lit/lit.js";import*as Ae from"./../../../ui/visual_logging/visual_logging.js";var ho=`:host{display:block}:host *{box-sizing:border-box}devtools-dialog{--override-transparent:color-mix(in srgb,var(--color-background) 80%,transparent)}.section-title{font-size:var(--sys-typescale-headline5-size);line-height:var(--sys-typescale-headline5-line-height);font-weight:var(--ref-typeface-weight-medium);margin:0}.privacy-disclosure{margin:8px 0}.url-override{margin:8px 0;display:flex;align-items:center;overflow:hidden;text-overflow:ellipsis;max-width:max-content}details > summary{font-size:var(--sys-typescale-body4-size);line-height:var(--sys-typescale-body4-line-height);font-weight:var(--ref-typeface-weight-medium)}.content{max-width:360px;box-sizing:border-box}.open-button-section{display:flex;flex-direction:row}.origin-mapping-grid{border:1px solid var(--sys-color-divider);margin-top:8px}.origin-mapping-description{margin-bottom:8px}.origin-mapping-button-section{display:flex;flex-direction:column;align-items:center;margin-top:var(--sys-size-6)}.config-button{margin-left:auto}.advanced-section-contents{margin:4px 0 14px}.buttons-section{display:flex;justify-content:space-between;margin-top:var(--sys-size-6);margin-bottom:var(--sys-size-2);devtools-button.enable{float:right}}input[type="checkbox"]{height:12px;width:12px;min-height:12px;min-width:12px;margin:6px}input[type="text"][disabled]{color:var(--sys-color-state-disabled)}.warning{margin:2px 8px;color:var(--color-error-text)}devtools-link{color:var(--sys-color-primary);text-decoration-line:underline}.divider{margin:10px 0;border:none;border-top:1px solid var(--sys-color-divider)}
/*# sourceURL=${import.meta.resolve("./fieldSettingsDialog.css")} */`;var So={};L(So,{DEFAULT_VIEW:()=>xo,OriginMap:()=>nt});import"./../../../ui/kit/kit.js";import"./../../../ui/legacy/components/data_grid/data_grid.js";import*as qi from"./../../../core/i18n/i18n.js";import*as vo from"./../../../core/sdk/sdk.js";import*as st from"./../../../models/crux-manager/crux-manager.js";import*as yo from"./../../../ui/components/render_coordinator/render_coordinator.js";import*as bo from"./../../../ui/legacy/legacy.js";import*as J from"./../../../ui/lit/lit.js";var fo=`.origin-warning-icon{width:16px;height:16px;margin-right:4px;color:var(--icon-warning)}.origin{text-overflow:ellipsis;overflow-x:hidden}.error-message{color:var(--sys-color-error);margin-top:8px;font-weight:var(--ref-typeface-weight-medium);white-space:pre-wrap}
/*# sourceURL=${import.meta.resolve("./originMap.css")} */`;var{html:xt}=J,Fe={developmentOrigin:"Development origin",productionOrigin:"Production origin",invalidOrigin:'"{PH1}" is not a valid origin or URL.',alreadyMapped:'"{PH1}" is already mapped to a production origin.',pageHasNoData:"The Chrome UX Report does not have sufficient real user data for this page."},Ir=qi.i18n.registerUIStrings("panels/timeline/components/OriginMap.ts",Fe),ot=qi.i18n.getLocalizedString.bind(void 0,Ir),Wi="developmentOrigin",wo="productionOrigin";function Pr(i,e){return yo.write(async()=>{if(!i.isCrUXEnabled)return J.nothing;let t=await i.getFieldDataForPage(e);return Object.entries(t).some(([o,n])=>o==="warnings"?!1:!!n)?J.nothing:xt`
      <devtools-icon
        class="origin-warning-icon"
        name="warning-filled"
        title=${ot(Fe.pageHasNoData)}
      ></devtools-icon>
    `})}function Mr(i,e,t){let s=J.Directives.until(Pr(i,e.productionOrigin));return xt`
    <tr data-index=${t} @edit=${i.onCommitEdit} @delete=${i.onRemoveItemRequested}>
      <td data-value=${e.developmentOrigin}>
        <div class="origin" title=${e.developmentOrigin}>${e.developmentOrigin}</div>
      </td>
      <td data-value=${e.productionOrigin}>
        ${s}
        <div class="origin" title=${e.productionOrigin}>${e.productionOrigin}</div>
      </td>
    </tr>
  `}var xo=(i,e,t)=>{if(!i.prefillDevelopmentOrigin&&i.mappings.length===0){J.render(J.nothing,t);return}J.render(xt`
    <devtools-data-grid striped inline
        @click=${s=>{s.stopPropagation()}}
        @create=${i.onCreate}>
      <table>
        <tr>
          <th id=${Wi} editable weight="1">${ot(Fe.developmentOrigin)}</th>
          <th id=${wo} editable weight="1">${ot(Fe.productionOrigin)}</th>
        </tr>
        ${i.mappings.map((s,o)=>Mr(i,s,o))}
        ${i.prefillDevelopmentOrigin?xt`
          <tr placeholder>
            <td>${i.prefillDevelopmentOrigin}</td>
            <td></td>
          </tr>`:J.nothing}
      </table>
    </devtools-data-grid>
    ${i.errorMessage?xt`<div class="error-message">${i.errorMessage}</div>`:J.nothing}
  `,t)},nt=class extends bo.Widget.VBox{#i;#e="";#t="";constructor(e,t=xo){super(e,{useShadowDom:!0}),this.#i=t,this.registerRequiredCSS(fo),st.CrUXManager.instance().getConfigSetting().addChangeListener(this.requestUpdate,this),this.requestUpdate()}performUpdate(){let e={mappings:this.#s(),prefillDevelopmentOrigin:this.#t,errorMessage:this.#e,isCrUXEnabled:st.CrUXManager.instance().isEnabled(),getFieldDataForPage:t=>st.CrUXManager.instance().getFieldDataForPage(t),onCommitEdit:this.#l.bind(this),onRemoveItemRequested:this.#a.bind(this),onCreate:this.#r.bind(this)};this.#i(e,void 0,this.contentElement)}#s(){return st.CrUXManager.instance().getConfigSetting().get().originMappings||[]}#n(e){let t=st.CrUXManager.instance().getConfigSetting(),s={...t.get()};s.originMappings=e,t.set(s)}#o(e){try{return new URL(e).origin}catch{return null}}startCreation(){let t=vo.TargetManager.TargetManager.instance().inspectedURL(),s=this.#o(t)||"";this.#t=s,this.requestUpdate()}#a(e){let t=e.currentTarget,s=Number.parseInt(t.dataset.index??"-1",10);if(s<0)return;let o=this.#s();o.splice(s,1),this.#n(o)}#l(e){let t=e.currentTarget,s=Number.parseInt(t.dataset.index??"-1",10);if(s<0)return;let o=this.#s(),n=o[s],r=e.detail.columnId===Wi,a=null;if(r?a=this.#d(e.detail.newText,s):a=this.#c(e.detail.newText),a){this.#e=a,this.requestUpdate();return}this.#e="",r?n.developmentOrigin=this.#o(e.detail.newText)||"":n.productionOrigin=this.#o(e.detail.newText)||"",this.#n(o)}#d(e,t){let s=this.#o(e);if(!s)return ot(Fe.invalidOrigin,{PH1:e});let o=this.#s();for(let n=0;n<o.length;++n){if(n===t)continue;if(o[n].developmentOrigin===s)return ot(Fe.alreadyMapped,{PH1:s})}return null}#c(e){return this.#o(e)?null:ot(Fe.invalidOrigin,{PH1:e})}#r(e){let t=e.detail[Wi]??"",s=e.detail[wo]??"";if(!t&&!s||t===this.#t&&!s){this.#t="",this.#e="",this.requestUpdate();return}let o=[this.#d(t),this.#c(s)].filter(Boolean);if(o.length>0){this.#e=o.join(`
`),this.requestUpdate();return}this.#e="",this.#t="";let n=this.#s();n.push({developmentOrigin:this.#o(t)||"",productionOrigin:this.#o(s)||""}),this.#n(n)}};var I={setUp:"Set up",configure:"Configure",ok:"Ok",optOut:"Opt out",cancel:"Cancel",onlyFetchFieldData:"Always show field metrics for the below URL",url:"URL",doesNotHaveSufficientData:"The Chrome UX Report does not have sufficient real-world speed data for this page.",configureFieldData:"Configure field metrics fetching",fetchAggregated:"Fetch aggregated field metrics from the {PH1} to help you contextualize local measurements with what real users experience on the site.",privacyDisclosure:"Privacy disclosure",whenPerformanceIsShown:"When DevTools is open, the URLs you visit will be sent to Google to query field metrics. These requests are not tied to your Google account.",advanced:"Advanced",mapDevelopmentOrigins:"Set a development origin to automatically get relevant field metrics for its production origin.",new:"New",invalidOrigin:'"{PH1}" is not a valid origin or URL.'},Co=di.i18n.registerUIStrings("panels/timeline/components/FieldSettingsDialog.ts",I),D=di.i18n.getLocalizedString.bind(void 0,Co),{html:$e,nothing:Dr,Directives:{ifDefined:Ur}}=St,{widget:Er,widgetRef:Rr}=ko.Widget,li=class i extends Event{static eventName="showdialog";constructor(){super(i.eventName)}},ci=class extends HTMLElement{#i=this.attachShadow({mode:"open"});#e;#t=ai.CrUXManager.instance().getConfigSetting();#s="";#n=!1;#o="";#a;constructor(){super();let e=ai.CrUXManager.instance();this.#t=e.getConfigSetting(),this.#l(),this.#g()}#l(){let e=this.#t.get();this.#s=e.override||"",this.#n=e.overrideEnabled||!1,this.#o=""}#d(e){let t=this.#t.get();this.#t.set({...t,enabled:e,override:this.#s,overrideEnabled:this.#n})}#c(){he.ScheduledRender.scheduleRender(this,this.#g)}async#r(e){let s=await ai.CrUXManager.instance().getFieldDataForPage(e);return Object.entries(s).some(([o,n])=>o==="warnings"?!1:!!n)}async#m(e){if(e&&this.#n){if(!this.#w(this.#s)){this.#o=D(I.invalidOrigin,{PH1:this.#s}),he.ScheduledRender.scheduleRender(this,this.#g);return}if(!await this.#r(this.#s)){this.#o=D(I.doesNotHaveSufficientData),he.ScheduledRender.scheduleRender(this,this.#g);return}}this.#d(e),this.#p()}#u(){if(!this.#e)throw new Error("Dialog not found");this.#l(),this.#e.setDialogVisible(!0),he.ScheduledRender.scheduleRender(this,this.#g),this.dispatchEvent(new li)}#p(e){if(!this.#e)throw new Error("Dialog not found");this.#e.setDialogVisible(!1),e&&e.stopImmediatePropagation(),he.ScheduledRender.scheduleRender(this,this.#g)}connectedCallback(){this.#t.addChangeListener(this.#c,this),he.ScheduledRender.scheduleRender(this,this.#g)}disconnectedCallback(){this.#t.removeChangeListener(this.#c,this)}#f(){return this.#t.get().enabled?$e`
        <devtools-button
          class="config-button"
          @click=${this.#u}
          .data=${{variant:"outlined",title:D(I.configure)}}
        jslog=${Ae.action("timeline.field-data.configure").track({click:!0})}
        >${D(I.configure)}</devtools-button>
      `:$e`
      <devtools-button
        class="setup-button"
        @click=${this.#u}
        .data=${{variant:"primary",title:D(I.setUp)}}
        jslog=${Ae.action("timeline.field-data.setup").track({click:!0})}
        data-field-data-setup
      >${D(I.setUp)}</devtools-button>
    `}#v(){return $e`
      <devtools-button
        @click=${()=>{this.#m(!0)}}
        .data=${{variant:"primary",title:D(I.ok)}}
        class="enable"
        jslog=${Ae.action("timeline.field-data.enable").track({click:!0})}
        data-field-data-enable
      >${D(I.ok)}</devtools-button>
    `}#y(){let e=this.#t.get().enabled?D(I.optOut):D(I.cancel);return $e`
      <devtools-button
        @click=${()=>{this.#m(!1)}}
        .data=${{variant:"outlined",title:e}}
        jslog=${Ae.action("timeline.field-data.disable").track({click:!0})}
        data-field-data-disable
      >${e}</devtools-button>
    `}#b(e){e.stopPropagation();let t=e.target;this.#s=t.value,this.#o="",he.ScheduledRender.scheduleRender(this,this.#g)}#h(e){e.stopPropagation();let t=e.target;this.#n=t.checked,this.#o="",he.ScheduledRender.scheduleRender(this,this.#g)}#w(e){try{return new URL(e).origin}catch{return null}}#x(){return $e`
      <div class="origin-mapping-description">${D(I.mapDevelopmentOrigins)}</div>
      <devtools-widget ${Er(nt)} ${Rr(nt,e=>{this.#a=e})}>
      </devtools-widget>
      <div class="origin-mapping-button-section">
        <devtools-button
          @click=${()=>this.#a?.startCreation()}
          .data=${{variant:"text",title:D(I.new),iconName:"plus"}}
          jslogContext="new-origin-mapping"
        >${D(I.new)}</devtools-button>
      </div>
    `}#g=()=>{let e=$e`
      <style>${ho}</style>
      <style>${mi.textInputStyles}</style>
      <style>${mi.checkboxStyles}</style>
      <div class="open-button-section">${this.#f()}</div>
      <devtools-dialog
        @clickoutsidedialog=${this.#p}
        .position=${"auto"}
        .horizontalAlignment=${"center"}
        .jslogContext=${"timeline.field-data.settings"}
        .expectedMutationsSelector=${".timeline-settings-pane option"}
        .dialogTitle=${D(I.configureFieldData)}
        ${St.Directives.ref(t=>{t instanceof HTMLElement&&(this.#e=t)})}
      >
        <div class="content">
          <div>
            ${To.getFormatLocalizedStringTemplate(Co,I.fetchAggregated,{PH1:$e`<devtools-link
                  href="https://developer.chrome.com/docs/crux"
                  >${di.i18n.lockedString("Chrome UX Report")}</devtools-link
                >`})}
          </div>
          <div class="privacy-disclosure">
            <h3 class="section-title">${D(I.privacyDisclosure)}</h3>
            <div>${D(I.whenPerformanceIsShown)}</div>
          </div>
          <details aria-label=${D(I.advanced)}>
            <summary>${D(I.advanced)}</summary>
            <div class="advanced-section-contents">
              ${this.#x()}
              <hr class="divider">
              <label class="url-override">
                <input
                  type="checkbox"
                  .checked=${this.#n}
                  @change=${this.#h}
                  aria-label=${D(I.onlyFetchFieldData)}
                  jslog=${Ae.toggle().track({click:!0}).context("field-url-override-enabled")}
                />
                ${D(I.onlyFetchFieldData)}
              </label>
              <input
                type="text"
                @keyup=${this.#b}
                @change=${this.#b}
                class="devtools-text-input"
                .disabled=${!this.#n}
                .value=${this.#s}
                placeholder=${Ur(this.#n?D(I.url):void 0)}
              />
              ${this.#o?$e`<div class="warning" role="alert" aria-label=${this.#o}>${this.#o}</div>`:Dr}
            </div>
          </details>
          <div class="buttons-section">
            ${this.#y()}
            ${this.#v()}
          </div>
        </div>
      </devtools-dialog>
    `;St.render(e,this.#i,{host:this})}};customElements.define("devtools-field-settings-dialog",ci);var Uo={};L(Uo,{DEFAULT_VIEW:()=>Do,IgnoreListSetting:()=>ji,regexInputIsValid:()=>Xi});import"./../../../ui/components/menus/menus.js";import*as Tt from"./../../../core/common/common.js";import*as Gi from"./../../../core/i18n/i18n.js";import*as Ki from"./../../../core/platform/platform.js";import*as Po from"./../../../models/workspace/workspace.js";import"./../../../ui/components/buttons/buttons.js";import"./../../../ui/components/dialogs/dialogs.js";import*as Mo from"./../../../ui/legacy/legacy.js";import*as Yi from"./../../../ui/lit/lit.js";var $o=`.ignore-list-setting-content{max-width:var(--sys-size-30)}.ignore-list-setting-description{margin-bottom:5px}.regex-row{display:flex;devtools-checkbox{flex:auto}devtools-button{height:24px}&:not(:hover) devtools-button{display:none}}.new-regex-row{display:flex;.new-regex-text-input{flex:auto}.harmony-input[type="text"]{border:1px solid var(--sys-color-neutral-outline);border-radius:4px;outline:none;&.error-input,
    &:invalid{border-color:var(--sys-color-error)}&:not(.error-input, :invalid):focus{border-color:var(--sys-color-state-focus-ring)}&:not(.error-input, :invalid):hover:not(:focus){background:var(--sys-color-state-hover-on-subtle)}}}
/*# sourceURL=${import.meta.resolve("./ignoreListSetting.css")} */`;var{html:Io,Directives:Hr}=Yi,{live:Nr}=Hr,Ie={showIgnoreListSettingDialog:"Show ignore list setting dialog",ignoreList:"Ignore list",ignoreListDescription:"Add regular expression rules to remove matching scripts from the flame chart.",ignoreScriptsWhoseNamesMatchS:"Ignore scripts whose names match ''{regex}''",removeRegex:"Remove the regex: ''{regex}''",addNewRegex:"Add a regular expression rule for the script's URL",ignoreScriptsWhoseNamesMatchNewRegex:"Ignore scripts whose names match the new regex"},Fr=Gi.i18n.registerUIStrings("panels/timeline/components/IgnoreListSetting.ts",Ie),ze=Gi.i18n.getLocalizedString.bind(void 0,Fr),Do=(i,e,t)=>{let{ignoreListEnabled:s,regexes:o,newRegexValue:n,newRegexChecked:r,onExistingRegexEnableToggle:a,onRemoveRegexByIndex:l,onNewRegexInputBlur:c,onNewRegexInputChange:u,onNewRegexInputFocus:g,onNewRegexAdd:h,onNewRegexCancel:w}=i;function T(f,K){let U=ze(Ie.ignoreScriptsWhoseNamesMatchS,{regex:f.pattern});return Io`
      <div class='regex-row'>
        <devtools-checkbox title=${U} aria-label=${U} ?checked=${!f.disabled}
          @change=${M=>a(f,M.currentTarget.checked)}
          .jslogContext=${"timeline.ignore-list-pattern"}>${f.pattern}</devtools-checkbox>
        <devtools-button
            @click=${()=>l(K)}
            .data=${{variant:"icon",iconName:"bin",title:ze(Ie.removeRegex,{regex:f.pattern}),jslogContext:"timeline.ignore-list-pattern.remove"}}>
        </devtools-button>
      </div>
    `}Yi.render(Io`
    <style>${$o}</style>
    <devtools-button-dialog
      @contextmenu=${f=>f.stopPropagation()}
      .data=${{openOnRender:!1,jslogContext:"timeline.ignore-list",variant:"toolbar",iconName:"compress",disabled:!s,iconTitle:ze(Ie.showIgnoreListSettingDialog),horizontalAlignment:"auto",closeButton:!0,dialogTitle:ze(Ie.ignoreList)}}>
      <div class='ignore-list-setting-content'>
        <div class='ignore-list-setting-description'>${ze(Ie.ignoreListDescription)}</div>
        ${o.map(T)}

        <div class='new-regex-row'>
          <devtools-checkbox
            title=${ze(Ie.ignoreScriptsWhoseNamesMatchNewRegex)}
            .jslogContext=${"timeline.ignore-list-new-regex.checkbox"}
            .checked=${r}
          >
          </devtools-checkbox>
          <input
            @blur=${f=>c(f.currentTarget.value)}
            @input=${f=>u(f.currentTarget.value)}
            @focus=${f=>g(f.currentTarget.value)}
            @keydown=${f=>{let K=f.currentTarget;f.key===Ki.KeyboardUtilities.ENTER_KEY?h(K.value):f.key===Ki.KeyboardUtilities.ESCAPE_KEY&&(w(),K.blur(),f.stopImmediatePropagation())}}
            class="harmony-input new-regex-text-input"
            title=${ze(Ie.addNewRegex)}
            placeholder='/framework\\.js$'
            .value=${Nr(n)}
            .jslogContext=${"timeline.ignore-list-new-regex.text"}>
        </div>
      </div>
    </devtools-button-dialog>
  `,t)},ji=class i extends Mo.Widget.Widget{static createWidgetElement(){let e=document.createElement("devtools-widget");return new i(e),e}#i;#e=Tt.Settings.Settings.instance().moduleSetting("enable-ignore-listing");#t=this.#a().getAsArray();#s="";#n=!1;#o=null;constructor(e,t=Do){super(e,{useShadowDom:!0}),this.#i=t,this.element.classList.remove("vbox","flex-auto"),Tt.Settings.Settings.instance().moduleSetting("skip-stack-frames-pattern").addChangeListener(this.requestUpdate.bind(this)),Tt.Settings.Settings.instance().moduleSetting("enable-ignore-listing").addChangeListener(this.requestUpdate.bind(this))}#a(){return Tt.Settings.Settings.instance().moduleSetting("skip-stack-frames-pattern")}#l(e){this.#o={pattern:e,disabled:!1},this.#t.push(this.#o)}#d(){if(!this.#o)return;let e=this.#t.pop();e&&e!==this.#o&&(console.warn("The last regex is not the editing one."),this.#t.push(e)),this.#o=null,this.#a().setAsArray(this.#t)}#c(){this.#s="",this.#n=!1,this.requestUpdate()}#r(e){let t=e.trim();this.#d(),Xi(t)&&(Po.IgnoreListManager.IgnoreListManager.instance().addRegexToIgnoreList(t),this.#c())}#m(e){this.#r(e),this.#l("")}#u(){this.#d(),this.#c()}#p(){if(this.#o){let e=this.#t[this.#t.length-1];if(e&&e===this.#o)return this.#t.slice(0,-1)}return this.#t}#f(e){let t=e.trim();this.#s=t,this.#o&&Xi(t)&&(this.#o.pattern=t,this.#o.disabled=!t,this.#a().setAsArray(this.#t))}#v(e,t){e.disabled=!t,this.#a().setAsArray(this.#t)}#y(e){this.#t.splice(e,1),this.#a().setAsArray(this.#t)}performUpdate(){let e={ignoreListEnabled:this.#e.get(),regexes:this.#p(),newRegexValue:this.#s,newRegexChecked:this.#n,onExistingRegexEnableToggle:this.#v.bind(this),onRemoveRegexByIndex:this.#y.bind(this),onNewRegexInputBlur:this.#r.bind(this),onNewRegexInputChange:this.#f.bind(this),onNewRegexInputFocus:this.#l.bind(this),onNewRegexAdd:this.#m.bind(this),onNewRegexCancel:this.#u.bind(this)};this.#i(e,void 0,this.contentElement)}};function Xi(i){let e=i.trim();if(!e.length)return!1;let t;try{t=new RegExp(e)}catch{}return!!t}var No={};L(No,{DEFAULT_VIEW:()=>Ho,InteractionBreakdown:()=>Zi});import*as Oe from"./../../../core/i18n/i18n.js";import*as Ro from"./../../../ui/legacy/legacy.js";import*as Qi from"./../../../ui/lit/lit.js";var Eo=`@scope to (devtools-widget > *){:host{display:block}.breakdown{margin:0;padding:0;list-style:none;color:var(--sys-color-token-subtle)}.value{display:inline-block;padding:0 5px;color:var(--sys-color-on-surface)}}
/*# sourceURL=${import.meta.resolve("./interactionBreakdown.css")} */`;var{html:Ar}=Qi,ui={inputDelay:"Input delay",processingDuration:"Processing duration",presentationDelay:"Presentation delay"},zr=Oe.i18n.registerUIStrings("panels/timeline/components/InteractionBreakdown.ts",ui),Ji=Oe.i18n.getLocalizedString.bind(void 0,zr),Ho=(i,e,t)=>{let{entry:s}=i,o=Oe.TimeUtilities.formatMicroSecondsAsMillisFixed(s.inputDelay),n=Oe.TimeUtilities.formatMicroSecondsAsMillisFixed(s.mainThreadHandling),r=Oe.TimeUtilities.formatMicroSecondsAsMillisFixed(s.presentationDelay);Qi.render(Ar`<style>${Eo}</style>
      <ul class="breakdown">
        <li data-entry="input-delay">${Ji(ui.inputDelay)}<span class="value">${o}</span></li>
        <li data-entry="processing-duration">${Ji(ui.processingDuration)}<span class="value">${n}</span></li>
        <li data-entry="presentation-delay">${Ji(ui.presentationDelay)}<span class="value">${r}</span></li>
      </ul>
  `,t)},Zi=class i extends Ro.Widget.Widget{static createWidgetElement(e){let t=document.createElement("devtools-widget"),s=new i(t);return s.entry=e,t}#i;#e=null;constructor(e,t=Ho){super(e,{useShadowDom:!0}),this.#i=t}set entry(e){e!==this.#e&&(this.#e=e,this.requestUpdate())}performUpdate(){if(!this.#e)return;let e={entry:this.#e};this.#i(e,void 0,this.contentElement)}};var Jo={};L(Jo,{DEFAULT_VIEW:()=>jo,LayoutShiftDetails:()=>ss});import*as Be from"./../../../core/i18n/i18n.js";import*as Vo from"./../../../core/sdk/sdk.js";import*as _o from"./../../../models/trace/helpers/helpers.js";import*as Ve from"./../../../models/trace/trace.js";import*as Wo from"./../../../ui/components/buttons/buttons.js";import*as os from"./../../../ui/legacy/components/utils/utils.js";import*as qo from"./../../../ui/legacy/legacy.js";import*as V from"./../../../ui/lit/lit.js";import*as Ko from"./insights/insights.js";import*as gi from"./../../../core/sdk/sdk.js";import*as Fo from"./../../../ui/components/buttons/buttons.js";import*as Ao from"./../../../ui/legacy/components/utils/utils.js";import*as ts from"./../../../ui/legacy/legacy.js";import*as Ct from"./../../../ui/lit/lit.js";import*as zo from"./../../common/common.js";var{html:kt}=Ct,{widget:Or}=ts.Widget,Br=(i,e,t)=>{let{relatedNodeEl:s,fallbackUrl:o,fallbackHtmlSnippet:n,fallbackText:r}=i,a;if(s)a=kt`<div class='node-link'>${s}</div>`;else if(o){let c={tabStop:!0,showColumnNumber:!1,inlineFrameIndex:0,maxLength:20},u=Ao.Linkifier.Linkifier.linkifyURL(o,c);a=kt`<div class='node-link'>
      <style>${Fo.textButtonStyles}</style>
      ${u}
    </div>`}else n?a=kt`<pre style='text-wrap: auto'>${n}</pre>`:r?a=kt`<span>${r}</span>`:a=Ct.nothing;Ct.render(a,t)},es=class extends ts.Widget.Widget{#i;#e;#t;#s;#n;#o;#a;#l=new Map;constructor(e,t=Br){super(e,{useShadowDom:!0}),this.#i=t}set data(e){this.#e=e.backendNodeId,this.#t=e.frame,this.#s=e.options,this.#n=e.fallbackUrl,this.#o=e.fallbackHtmlSnippet,this.#a=e.fallbackText,this.requestUpdate()}async#d(){if(this.#e===void 0)return;let e=this.#l.get(this.#e);if(e)return e==="NO_NODE_FOUND"?void 0:e;let s=gi.TargetManager.TargetManager.instance().primaryPageTarget()?.model(gi.DOMModel.DOMModel);if(!s)return;let n=(await s.pushNodesByBackendIdsToFrontend(new Set([this.#e])))?.get(this.#e);if(!n){this.#l.set(this.#e,"NO_NODE_FOUND");return}if(n.frameId()!==this.#t){this.#l.set(this.#e,"NO_NODE_FOUND");return}let r=zo.DOMLinkifier.Linkifier.instance().linkify(n,this.#s);return this.#l.set(this.#e,r),r}async performUpdate(){let e={relatedNodeEl:await this.#d(),fallbackUrl:this.#n,fallbackHtmlSnippet:this.#o,fallbackText:this.#a};this.#i(e,void 0,this.contentElement)}};function is(i){return kt`${Or(es,{data:i})}`}var Oo=`@scope to (devtools-widget > *){.layout-shift-details-title,
  .cluster-details-title{padding-bottom:var(--sys-size-5);display:flex;align-items:center;.layout-shift-event-title,
    .cluster-event-title{background-color:var(--app-color-rendering);width:var(--sys-size-6);height:var(--sys-size-6);border:var(--sys-size-1) solid var(--sys-color-divider);box-sizing:content-box;display:inline-block;margin-right:var(--sys-size-3)}}.layout-shift-details-table{font:var(--sys-typescale-body4-regular);margin-bottom:var(--sys-size-4);text-align:left;border-block:var(--sys-size-1) solid var(--sys-color-divider);border-collapse:collapse;font-variant-numeric:tabular-nums;th,
    td{padding-right:var(--sys-size-4);min-width:var(--sys-size-20);max-width:var(--sys-size-28)}}.table-title{th{font:var(--sys-typescale-body4-medium)}tr{border-bottom:var(--sys-size-1) solid var(--sys-color-divider)}}.timeline-link{cursor:pointer;text-decoration:underline;color:var(--sys-color-primary);background:none;border:none;padding:0;font:inherit;text-align:left}.parent-cluster-link{margin-left:var(--sys-size-2)}.timeline-link.invalid-link{color:var(--sys-color-state-disabled)}.details-row{display:flex;min-height:var(--sys-size-9)}.title{color:var(--sys-color-token-subtle);overflow:hidden;padding-right:var(--sys-size-5);display:inline-block;vertical-align:top}.culprit{display:inline-flex;flex-direction:row;gap:var(--sys-size-3)}.value{display:inline-block;user-select:text;text-overflow:ellipsis;overflow:hidden;padding:0 var(--sys-size-3)}.layout-shift-summary-details,
  .layout-shift-cluster-summary-details{font:var(--sys-typescale-body4-regular);display:flex;flex-direction:column;column-gap:var(--sys-size-4);padding:var(--sys-size-5) var(--sys-size-5) 0 var(--sys-size-5)}.culprits{display:flex;flex-direction:column}.shift-row:not(:last-child){border-bottom:var(--sys-size-1) solid var(--sys-color-divider)}.total-row{font:var(--sys-typescale-body4-medium)}}
/*# sourceURL=${import.meta.resolve("./layoutShiftDetails.css")} */`;var{html:z,render:Bo}=V,Vr=20,F={startTime:"Start time",shiftScore:"Shift score",elementsShifted:"Elements shifted",culprit:"Culprit",injectedIframe:"Injected iframe",fontRequest:"Font request",nonCompositedAnimation:"Non-composited animation",animation:"Animation",parentCluster:"Parent cluster",cluster:"Layout shift cluster @ {PH1}",layoutShift:"Layout shift @ {PH1}",total:"Total",unsizedImage:"Unsized image"},_r=Be.i18n.registerUIStrings("panels/timeline/components/LayoutShiftDetails.ts",F),A=Be.i18n.getLocalizedString.bind(void 0,_r),ss=class extends qo.Widget.Widget{#i;#e=null;#t=null;#s=!1;constructor(e,t=jo){super(e),this.#i=t}set event(e){this.#e=e,this.requestUpdate()}set parsedTrace(e){this.#t=e,this.requestUpdate()}set isFreshRecording(e){this.#s=e,this.requestUpdate()}#n(e){this.contentElement.dispatchEvent(new Ko.EventRef.EventReferenceClick(e))}#o(e){let t=e.type==="mouseover";if(e.type==="mouseleave"&&this.contentElement.dispatchEvent(new CustomEvent("toggle-popover",{detail:{show:t},bubbles:!0,composed:!0})),!(e.target instanceof HTMLElement)||!this.#e)return;let s=e.target.closest("tbody tr");if(!s?.parentElement)return;let o=Ve.Types.Events.isSyntheticLayoutShift(this.#e)?this.#e:this.#e.events.find(n=>n.ts===parseInt(s.getAttribute("data-ts")??"",10));this.contentElement.dispatchEvent(new CustomEvent("toggle-popover",{detail:{event:o,show:t},bubbles:!0,composed:!0}))}performUpdate(){this.#i({event:this.#e,parsedTrace:this.#t,isFreshRecording:this.#s,togglePopover:e=>this.#o(e),onEventClick:e=>this.#n(e)},{},this.contentElement)}},jo=(i,e,t)=>{if(!i.event||!i.parsedTrace){Bo(V.nothing,t);return}let s=Ve.Name.forEntry(i.event);Bo(z`
        <style>${Oo}</style>
        <style>${Wo.textButtonStyles}</style>

      <div class="layout-shift-summary-details">
        <div
          class="event-details"
          @mouseover=${i.togglePopover}
          @mouseleave=${i.togglePopover}
        >
        <div class="layout-shift-details-title">
          <div class="layout-shift-event-title"></div>
          ${s}
        </div>
        ${Ve.Types.Events.isSyntheticLayoutShift(i.event)?Wr(i.event,i.parsedTrace.insights,i.parsedTrace,i.isFreshRecording,i.onEventClick):qr(i.event,i.parsedTrace.insights,i.parsedTrace,i.onEventClick)}
        </div>
      </div>
      `,t)};function Xo(i,e){return i?.values().find(t=>e?e===t.navigation?.args.data?.navigationId:!t.navigation)}function Wr(i,e,t,s,o){if(!e)return V.nothing;let n=Xo(e,i.args.data?.navigationId)?.model.CLSCulprits;if(!n)return V.nothing;let r=n.shifts.get(i),a=i.args.data?.impacted_nodes??[];s||(a=a?.filter(g=>g.debug_name));let l=r&&(r.webFonts.length||r.iframes.length||r.nonCompositedAnimations.length||r.unsizedImages.length),c=a?.length,u=n.clusters.find(g=>g.events.find(h=>h===i));return z`
      <table class="layout-shift-details-table">
        <thead class="table-title">
          <tr>
            <th>${A(F.startTime)}</th>
            <th>${A(F.shiftScore)}</th>
            ${c?z`
              <th>${A(F.elementsShifted)}</th>`:V.nothing}
            ${l?z`
              <th>${A(F.culprit)}</th> `:V.nothing}
          </tr>
        </thead>
        <tbody>
          ${Go(i,!0,t,a,o,r)}
        </tbody>
      </table>
      ${jr(u,o,t)}
    `}function qr(i,e,t,s){if(!e)return V.nothing;let o=Xo(e,i.navigationId)?.model.CLSCulprits;if(!o)return V.nothing;let r=!!Array.from(o.shifts.entries()).filter(([a])=>i.events.includes(a)).map(([,a])=>a).flatMap(a=>Object.values(a)).flat().length;return z`
    <table class="layout-shift-details-table">
      <thead class="table-title">
        <tr>
          <th>${A(F.startTime)}</th>
          <th>${A(F.shiftScore)}</th>
          <th>${A(F.elementsShifted)}</th>
          ${r?z`
            <th>${A(F.culprit)}</th> `:V.nothing}
        </tr>
      </thead>
      <tbody>
        ${i.events.map(a=>{let l=o.shifts.get(a),c=a.args.data?.impacted_nodes??[];return Go(a,!1,t,c,s,l)})}

        <tr>
          <td class="total-row">${A(F.total)}</td>
          <td class="total-row">${i.clusterCumulativeScore.toFixed(4)}</td>
        </tr>
      </tbody>
    </table>
  `}function Go(i,e,t,s,o,n){let r=i.args.data?.weighted_score_delta;if(!r)return V.nothing;let a=!!(n&&(n.webFonts.length||n.iframes.length||n.nonCompositedAnimations.length||n.unsizedImages.length));return z`
      <tr class="shift-row" data-ts=${i.ts}>
        <td>${Kr(i,e,t,o)}</td>
        <td>${r.toFixed(4)}</td>
        ${s.length?z`
          <td>
            <div class="elements-shifted">
              ${Xr(i,s)}
            </div>
          </td>`:V.nothing}
        ${a?z`
          <td class="culprits">
            ${n?.webFonts.map(l=>Jr(l))}
            ${n?.iframes.map(l=>Zr(l))}
            ${n?.nonCompositedAnimations.map(l=>Gr(l,o))}
            ${n?.unsizedImages.map(l=>Yr(i.args.frame,l))}
          </td>`:V.nothing}
      </tr>`}function Kr(i,e,t,s){let o=Ve.Types.Timing.Micro(i.ts-t.data.Meta.traceBounds.min);if(e)return z`${Be.TimeUtilities.preciseMillisToString(_o.Timing.microToMilli(o))}`;let n=Be.TimeUtilities.formatMicroSecondsTime(o);return z`
         <button type="button" class="timeline-link" @click=${()=>s(i)}>${A(F.layoutShift,{PH1:n})}</button>`}function jr(i,e,t){if(!i)return V.nothing;let s=Ve.Types.Timing.Micro(i.ts-(t.data.Meta.traceBounds.min??0)),o=Be.TimeUtilities.formatMicroSecondsTime(s);return z`
      <span class="parent-cluster">${A(F.parentCluster)}:<button type="button" class="timeline-link parent-cluster-link" @click=${()=>e(i)}>${A(F.cluster,{PH1:o})}</button>
      </span>`}function Xr(i,e){return z`
      ${e?.map(t=>t.node_id!==void 0?is({backendNodeId:t.node_id,frame:i.args.frame,fallbackHtmlSnippet:t.debug_name}):V.nothing)}`}function Gr(i,e){let t=i.animation;return t?z`
        <span class="culprit">
        <span class="culprit-type">${A(F.nonCompositedAnimation)}: </span>
        <button type="button" class="culprit-value timeline-link" @click=${()=>e(t)}>${A(F.animation)}</button>
      </span>`:V.nothing}function Yr(i,e){let t=is({backendNodeId:e.backendNodeId,frame:i,fallbackUrl:e.paintImageEvent.args.data.url});return z`
    <span class="culprit">
      <span class="culprit-type">${A(F.unsizedImage)}: </span>
      <span class="culprit-value">${t}</span>
    </span>`}function Jr(i){let e=Yo(i.args.data.url);return z`
      <span class="culprit">
        <span class="culprit-type">${A(F.fontRequest)}: </span>
        <span class="culprit-value">${e}</span>
      </span>`}function Yo(i){return os.Linkifier.Linkifier.linkifyURL(i,{tabStop:!0,showColumnNumber:!1,inlineFrameIndex:0,maxLength:Vr})}function Zr(i){let e=i.frame,t=Vo.FrameManager.FrameManager.instance().getFrame(e),s;return t?s=os.Linkifier.Linkifier.linkifyRevealable(t,t.displayName()):s=Yo(i.url),z`
      <span class="culprit">
        <span class="culprit-type"> ${A(F.injectedIframe)}: </span>
        <span class="culprit-value">${s}</span>
      </span>`}var wn={};L(wn,{DEFAULT_VIEW:()=>bn,LiveMetricsView:()=>us});import"./../../../ui/components/settings/settings.js";import"./../../../ui/kit/kit.js";var tn={};L(tn,{NetworkThrottlingSelector:()=>hi});import"./../../../ui/kit/kit.js";import"./../../../ui/components/menus/menus.js";import*as fi from"./../../../core/common/common.js";import*as ns from"./../../../core/i18n/i18n.js";import*as Qo from"./../../../core/platform/platform.js";import*as Pe from"./../../../core/sdk/sdk.js";import*as pi from"./../../../ui/components/helpers/helpers.js";import*as rs from"./../../../ui/lit/lit.js";import*as vi from"./../../../ui/visual_logging/visual_logging.js";import*as en from"./../../mobile_throttling/mobile_throttling.js";var Zo=`:host{display:flex;align-items:center;max-width:100%;height:20px}devtools-icon[name="info"]{margin-left:var(--sys-size-3);width:var(--sys-size-8);height:var(--sys-size-8)}devtools-select-menu{min-width:160px;max-width:100%;height:20px}
/*# sourceURL=${import.meta.resolve("./networkThrottlingSelector.css")} */`;var{html:Lt,nothing:Qr}=rs,ae={network:"Network: {PH1}",networkThrottling:"Network throttling: {PH1}",recommendedThrottling:"{PH1} \u2013 recommended",recommendedThrottlingReason:"Consider changing setting to simulate real user environments",disabled:"Disabled",presets:"Presets",custom:"Custom",add:"Add\u2026"},ea=ns.i18n.registerUIStrings("panels/timeline/components/NetworkThrottlingSelector.ts",ae),fe=ns.i18n.getLocalizedString.bind(void 0,ea),hi=class extends HTMLElement{#i=this.attachShadow({mode:"open"});#e;#t=[];#s;#n=null;constructor(){super(),this.#e=fi.Settings.Settings.instance().moduleSetting("custom-network-conditions"),this.#o(),this.#s=Pe.NetworkManager.MultitargetNetworkManager.instance().networkConditions(),this.#u()}set recommendedConditions(e){this.#n=e,pi.ScheduledRender.scheduleRender(this,this.#u)}connectedCallback(){Pe.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged",this.#a,this),this.#a(),this.#e.addChangeListener(this.#d,this)}disconnectedCallback(){Pe.NetworkManager.MultitargetNetworkManager.instance().removeEventListener("ConditionsChanged",this.#a,this),this.#e.removeChangeListener(this.#d,this)}#o(){this.#t=[{name:fe(ae.disabled),items:[Pe.NetworkManager.NoThrottlingConditions]},{name:fe(ae.presets),items:en.ThrottlingPresets.ThrottlingPresets.networkPresets},{name:fe(ae.custom),items:this.#e.get(),showCustomAddOption:!0,jslogContext:"custom-network-throttling-item"}]}#a(){this.#s=Pe.NetworkManager.MultitargetNetworkManager.instance().networkConditions(),pi.ScheduledRender.scheduleRender(this,this.#u)}#l(e){let t=this.#t.flatMap(s=>s.items).find(s=>this.#m(s)===e.itemValue);t&&Pe.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(t)}#d(){this.#o(),pi.ScheduledRender.scheduleRender(this,this.#u)}#c(e){return e.title instanceof Function?e.title():e.title}#r(){fi.Revealer.reveal(this.#e)}#m(e){return e.i18nTitleKey||this.#c(e)}#u=()=>{let e=this.#c(this.#s),t=this.#m(this.#s),s;this.#n&&this.#s===Pe.NetworkManager.NoThrottlingConditions&&(s=Lt`<devtools-icon
        title=${fe(ae.recommendedThrottlingReason)}
        name=info></devtools-icon>`);let o=Lt`
      <style>${Zo}</style>
      <devtools-select-menu
        @selectmenuselected=${this.#l}
        .showDivider=${!0}
        .showArrow=${!0}
        .sideButton=${!1}
        .showSelectedItem=${!0}
        .jslogContext=${"network-conditions"}
        .buttonTitle=${fe(ae.network,{PH1:e})}
        .title=${fe(ae.networkThrottling,{PH1:e})}
      >
        ${this.#t.map(n=>Lt`
            <devtools-menu-group .name=${n.name} .title=${n.name}>
              ${n.items.map(r=>{let a=this.#c(r);r===this.#n&&(a=fe(ae.recommendedThrottling,{PH1:a}));let l=this.#m(r),c=n.jslogContext||Qo.StringUtilities.toKebabCase(r.i18nTitleKey||a);return Lt`
                  <devtools-menu-item
                    .value=${l}
                    .selected=${t===l}
                    .title=${a}
                    jslog=${vi.item(c).track({click:!0})}
                  >
                    ${a}
                  </devtools-menu-item>
                `})}
              ${n.showCustomAddOption?Lt`
                <devtools-menu-item
                  .value=${1}
                  .title=${fe(ae.add)}
                  jslog=${vi.action("add").track({click:!0})}
                  @click=${this.#r}
                >
                  ${fe(ae.add)}
                </devtools-menu-item>
              `:Qr}
            </devtools-menu-group>
          `)}
      </devtools-select-menu>
      ${s}
    `;rs.render(o,this.#i,{host:this})}};customElements.define("devtools-network-throttling-selector",hi);import"./../../../ui/components/menus/menus.js";var cn={};L(cn,{MetricCard:()=>yi});import*as j from"./../../../core/i18n/i18n.js";import*as an from"./../../../core/platform/platform.js";import*as as from"./../../../models/crux-manager/crux-manager.js";import"./../../../ui/components/buttons/buttons.js";import*as ls from"./../../../ui/components/helpers/helpers.js";import*as ln from"./../../../ui/helpers/helpers.js";import*as le from"./../../../ui/lit/lit.js";var sn=`.metric-card{border-radius:var(--sys-shape-corner-small);padding:14px 16px;background-color:var(--sys-color-surface3);height:100%;box-sizing:border-box}.title{display:flex;justify-content:space-between;font-size:var(--sys-typescale-headline5-size);line-height:var(--sys-typescale-headline5-line-height);font-weight:var(--ref-typeface-weight-medium);margin:0;margin-bottom:6px}.title-help{height:var(--sys-typescale-headline5-line-height);margin-left:4px}.metric-values-section{position:relative;display:flex;column-gap:8px;margin-bottom:8px}.metric-values-section:focus-visible{outline:2px solid -webkit-focus-ring-color}.metric-source-block{flex:1}.metric-source-value{font-size:32px;line-height:36px;font-weight:var(--ref-typeface-weight-regular)}.metric-source-label{font-weight:var(--ref-typeface-weight-medium)}.warning{margin-top:4px;color:var(--sys-color-error);font-size:var(--sys-typescale-body4-size);line-height:var(--sys-typescale-body4-line-height);display:flex;&::before{content:" ";width:var(--sys-typescale-body4-line-height);height:var(--sys-typescale-body4-line-height);mask-size:var(--sys-typescale-body4-line-height);mask-image:var(--image-file-warning);background-color:var(--sys-color-error);margin-right:4px;flex-shrink:0}}.good-bg{background-color:var(--app-color-performance-good)}.needs-improvement-bg{background-color:var(--app-color-performance-ok)}.poor-bg{background-color:var(--app-color-performance-bad)}.divider{width:100%;border:0;border-bottom:1px solid var(--sys-color-divider);margin:8px 0;box-sizing:border-box}.compare-text{margin-top:8px}.environment-recs-intro{margin-top:8px}.environment-recs{margin:9px 0}.environment-recs > summary{font-weight:var(--ref-typeface-weight-medium);margin-bottom:4px;font-size:var(--sys-typescale-body4-size);line-height:var(--sys-typescale-body4-line-height);display:flex;&::before{content:" ";width:var(--sys-typescale-body4-line-height);height:var(--sys-typescale-body4-line-height);mask-size:var(--sys-typescale-body4-line-height);mask-image:var(--image-file-triangle-right);background-color:var(--icon-default);margin-right:4px;flex-shrink:0}}details.environment-recs[open] > summary::before{mask-image:var(--image-file-triangle-down)}.environment-recs-list{margin:0}.detailed-compare-text{margin-bottom:8px}.bucket-summaries{margin-top:8px;white-space:nowrap}.bucket-summaries.histogram{display:grid;grid-template-columns:minmax(min-content,auto) minmax(40px,60px) max-content;grid-auto-rows:1fr;column-gap:8px;place-items:center flex-end}.bucket-label{justify-self:start;font-weight:var(--ref-typeface-weight-medium);white-space:wrap;> *{white-space:nowrap}}.bucket-range{color:var(--sys-color-token-subtle)}.histogram-bar{height:6px}.histogram-percent{color:var(--sys-color-token-subtle);font-weight:var(--ref-typeface-weight-medium)}.tooltip{display:none;visibility:hidden;transition-property:visibility;width:min(var(--tooltip-container-width,350px),350px);max-width:max-content;position:absolute;top:100%;left:50%;transform:translateX(-50%);z-index:1;box-sizing:border-box;padding:var(--sys-size-5) var(--sys-size-6);border-radius:var(--sys-shape-corner-small);background-color:var(--sys-color-cdt-base-container);box-shadow:var(--drop-shadow-depth-3);.tooltip-scroll{overflow-x:auto;.tooltip-contents{min-width:min-content}}}.phase-table{display:grid;column-gap:var(--sys-size-3);white-space:nowrap}.phase-table-row{display:contents}.phase-table-value{text-align:right}.phase-table-header-row{font-weight:var(--ref-typeface-weight-medium)}
/*# sourceURL=${import.meta.resolve("./metricCard.css")} */`;import*as on from"./../../../core/i18n/i18n.js";import*as k from"./../../../ui/i18n/i18n.js";var C={goodBetterCompare:"Your local {PH1} value of {PH2} is good, but is significantly better than your users\u2019 experience.",goodWorseCompare:"Your local {PH1} value of {PH2} is good, but is significantly worse than your users\u2019 experience.",goodSimilarCompare:"Your local {PH1} value of {PH2} is good, and is similar to your users\u2019 experience.",goodSummarized:"Your local {PH1} value of {PH2} is good.",needsImprovementBetterCompare:"Your local {PH1} value of {PH2} needs improvement, but is significantly better than your users\u2019 experience.",needsImprovementWorseCompare:"Your local {PH1} value of {PH2} needs improvement, but is significantly worse than your users\u2019 experience.",needsImprovementSimilarCompare:"Your local {PH1} value of {PH2} needs improvement, and is similar to your users\u2019 experience.",needsImprovementSummarized:"Your local {PH1} value of {PH2} needs improvement.",poorBetterCompare:"Your local {PH1} value of {PH2} is poor, but is significantly better than your users\u2019 experience.",poorWorseCompare:"Your local {PH1} value of {PH2} is poor, but is significantly worse than your users\u2019 experience.",poorSimilarCompare:"Your local {PH1} value of {PH2} is poor, and is similar to your users\u2019 experience.",poorSummarized:"Your local {PH1} value of {PH2} is poor.",goodGoodDetailedCompare:"Your local {PH1} value of {PH2} is good and is rated the same as {PH4} of real-user {PH1} experiences. Additionally, the field metrics 75th percentile {PH1} value of {PH3} is good.",goodNeedsImprovementDetailedCompare:"Your local {PH1} value of {PH2} is good and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} needs improvement.",goodPoorDetailedCompare:"Your local {PH1} value of {PH2} is good and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is poor.",needsImprovementGoodDetailedCompare:"Your local {PH1} value of {PH2} needs improvement and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is good.",needsImprovementNeedsImprovementDetailedCompare:"Your local {PH1} value of {PH2} needs improvement and is rated the same as {PH4} of real-user {PH1} experiences. Additionally, the field metrics 75th percentile {PH1} value of {PH3} needs improvement.",needsImprovementPoorDetailedCompare:"Your local {PH1} value of {PH2} needs improvement and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is poor.",poorGoodDetailedCompare:"Your local {PH1} value of {PH2} is poor and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is good.",poorNeedsImprovementDetailedCompare:"Your local {PH1} value of {PH2} is poor and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} needs improvement.",poorPoorDetailedCompare:"Your local {PH1} value of {PH2} is poor and is rated the same as {PH4} of real-user {PH1} experiences. Additionally, the field metrics 75th percentile {PH1} value of {PH3} is poor."},$=on.i18n.registerUIStrings("panels/timeline/components/MetricCompareStrings.ts",C);function nn(i){let{rating:e,compare:t}=i,s={PH1:i.metric,PH2:i.localValue};if(e==="good"&&t==="better")return k.getFormatLocalizedString($,C.goodBetterCompare,s);if(e==="good"&&t==="worse")return k.getFormatLocalizedString($,C.goodWorseCompare,s);if(e==="good"&&t==="similar")return k.getFormatLocalizedString($,C.goodSimilarCompare,s);if(e==="good"&&!t)return k.getFormatLocalizedString($,C.goodSummarized,s);if(e==="needs-improvement"&&t==="better")return k.getFormatLocalizedString($,C.needsImprovementBetterCompare,s);if(e==="needs-improvement"&&t==="worse")return k.getFormatLocalizedString($,C.needsImprovementWorseCompare,s);if(e==="needs-improvement"&&t==="similar")return k.getFormatLocalizedString($,C.needsImprovementSimilarCompare,s);if(e==="needs-improvement"&&!t)return k.getFormatLocalizedString($,C.needsImprovementSummarized,s);if(e==="poor"&&t==="better")return k.getFormatLocalizedString($,C.poorBetterCompare,s);if(e==="poor"&&t==="worse")return k.getFormatLocalizedString($,C.poorWorseCompare,s);if(e==="poor"&&t==="similar")return k.getFormatLocalizedString($,C.poorSimilarCompare,s);if(e==="poor"&&!t)return k.getFormatLocalizedString($,C.poorSummarized,s);throw new Error("Compare string not found")}function rn(i){let{localRating:e,fieldRating:t}=i,s={PH1:i.metric,PH2:i.localValue,PH3:i.fieldValue,PH4:i.percent};if(e==="good"&&t==="good")return k.getFormatLocalizedString($,C.goodGoodDetailedCompare,s);if(e==="good"&&t==="needs-improvement")return k.getFormatLocalizedString($,C.goodNeedsImprovementDetailedCompare,s);if(e==="good"&&t==="poor")return k.getFormatLocalizedString($,C.goodPoorDetailedCompare,s);if(e==="good"&&!t)return k.getFormatLocalizedString($,C.goodSummarized,s);if(e==="needs-improvement"&&t==="good")return k.getFormatLocalizedString($,C.needsImprovementGoodDetailedCompare,s);if(e==="needs-improvement"&&t==="needs-improvement")return k.getFormatLocalizedString($,C.needsImprovementNeedsImprovementDetailedCompare,s);if(e==="needs-improvement"&&t==="poor")return k.getFormatLocalizedString($,C.needsImprovementPoorDetailedCompare,s);if(e==="needs-improvement"&&!t)return k.getFormatLocalizedString($,C.needsImprovementSummarized,s);if(e==="poor"&&t==="good")return k.getFormatLocalizedString($,C.poorGoodDetailedCompare,s);if(e==="poor"&&t==="needs-improvement")return k.getFormatLocalizedString($,C.poorNeedsImprovementDetailedCompare,s);if(e==="poor"&&t==="poor")return k.getFormatLocalizedString($,C.poorPoorDetailedCompare,s);if(e==="poor"&&!t)return k.getFormatLocalizedString($,C.poorSummarized,s);throw new Error("Detailed compare string not found")}var $t=`.metric-value{text-wrap:nowrap}.metric-value.dim{font-weight:var(--ref-typeface-weight-medium)}.metric-value.waiting{color:var(--sys-color-token-subtle)}.metric-value.good{color:var(--app-color-performance-good)}.metric-value.needs-improvement{color:var(--app-color-performance-ok)}.metric-value.poor{color:var(--app-color-performance-bad)}.metric-value.good.dim{color:var(--app-color-performance-good-dim)}.metric-value.needs-improvement.dim{color:var(--app-color-performance-ok-dim)}.metric-value.poor.dim{color:var(--app-color-performance-bad-dim)}
/*# sourceURL=${import.meta.resolve("./metricValueStyles.css")} */`;var{html:R,nothing:rt}=le,b={localValue:"Local",field75thPercentile:"Field 75th percentile",fieldP75:"Field p75",good:"Good",needsImprovement:"Needs improvement",poor:"Poor",leqRange:"(\u2264{PH1})",betweenRange:"({PH1}-{PH2})",gtRange:"(>{PH1})",percentage:"{PH1}%",interactToMeasure:"Interact with the page to measure INP.",viewCardDetails:"View card details",considerTesting:"Consider your local test conditions",recThrottlingLCP:"Real users may experience longer page loads due to slower network conditions. Increasing network throttling will simulate slower network conditions.",recThrottlingINP:"Real users may experience longer interactions due to slower CPU speeds. Increasing CPU throttling will simulate a slower device.",recViewportLCP:"Screen size can influence what the LCP element is. Ensure you are testing common viewport sizes.",recViewportCLS:"Screen size can influence what layout shifts happen. Ensure you are testing common viewport sizes.",recJourneyCLS:"How a user interacts with the page can influence layout shifts. Ensure you are testing common interactions like scrolling the page.",recJourneyINP:"How a user interacts with the page influences interaction delays. Ensure you are testing common interactions.",recDynamicContentLCP:"The LCP element can vary between page loads if content is dynamic.",recDynamicContentCLS:"Dynamic content can influence what layout shifts happen.",phase:"Phase",lcpHelpTooltip:"LCP reports the render time of the largest image, text block, or video visible in the viewport. Click here to learn more about LCP.",clsHelpTooltip:"CLS measures the amount of unexpected shifted content. Click here to learn more about CLS.",inpHelpTooltip:"INP measures the overall responsiveness to all click, tap, and keyboard interactions. Click here to learn more about INP."},ta=j.i18n.registerUIStrings("panels/timeline/components/MetricCard.ts",b),x=j.i18n.getLocalizedString.bind(void 0,ta),yi=class extends HTMLElement{#i=this.attachShadow({mode:"open"});constructor(){super(),this.#k()}#e;#t={metric:"LCP"};set data(e){this.#t=e,ls.ScheduledRender.scheduleRender(this,this.#k)}connectedCallback(){ls.ScheduledRender.scheduleRender(this,this.#k)}#s=e=>{an.KeyboardUtilities.isEscKey(e)&&(e.stopPropagation(),this.#a())};#n(e){e.target?.hasFocus()||this.#a()}#o(e){let t=e.target;if(t?.hasFocus())return;let s=e.relatedTarget;s instanceof Node&&t.contains(s)||this.#a()}#a(){let e=this.#e;e&&(document.body.removeEventListener("keydown",this.#s),e.style.removeProperty("left"),e.style.removeProperty("visibility"),e.style.removeProperty("display"),e.style.removeProperty("transition-delay"))}#l(e=0){let t=this.#e;if(!t||t.style.visibility||t.style.display)return;document.body.addEventListener("keydown",this.#s),t.style.display="block",t.style.transitionDelay=`${Math.round(e)}ms`;let s=this.#t.tooltipContainer;if(!s)return;let o=s.getBoundingClientRect();t.style.setProperty("--tooltip-container-width",`${Math.round(o.width)}px`),requestAnimationFrame(()=>{let n=0,r=t.getBoundingClientRect(),a=r.right-o.right,l=r.left-o.left;l<0?n=Math.round(l):a>0&&(n=Math.round(a)),t.style.left=`calc(50% - ${n}px)`,t.style.visibility="visible"})}#d(){switch(this.#t.metric){case"LCP":return j.i18n.lockedString("Largest Contentful Paint (LCP)");case"CLS":return j.i18n.lockedString("Cumulative Layout Shift (CLS)");case"INP":return j.i18n.lockedString("Interaction to Next Paint (INP)")}}#c(){switch(this.#t.metric){case"LCP":return ei;case"CLS":return tt;case"INP":return it}}#r(){switch(this.#t.metric){case"LCP":return e=>{let t=e*1e3;return j.TimeUtilities.formatMicroSecondsAsSeconds(t)};case"CLS":return e=>e===0?"0":e.toFixed(2);case"INP":return e=>j.TimeUtilities.preciseMillisToString(e)}}#m(){switch(this.#t.metric){case"LCP":return"https://web.dev/articles/lcp";case"CLS":return"https://web.dev/articles/cls";case"INP":return"https://web.dev/articles/inp"}}#u(){switch(this.#t.metric){case"LCP":return x(b.lcpHelpTooltip);case"CLS":return x(b.clsHelpTooltip);case"INP":return x(b.inpHelpTooltip)}}#p(){let{localValue:e}=this.#t;if(e!==void 0)return e}#f(){let{fieldValue:e}=this.#t;if(e!==void 0&&(typeof e=="string"&&(e=Number(e)),!!Number.isFinite(e)))return e}#v(){let e=this.#p(),t=this.#f();if(!(e===void 0||t===void 0))return yt(this.#t.metric,e,t)}#y(){let e=this.#p();if(e===void 0)return this.#t.metric==="INP"?R`
          <div class="compare-text">${x(b.interactToMeasure)}</div>
        `:le.nothing;let t=this.#v(),s=Se(e,this.#c()),o=ne(this.#h(!0),e,this.#c(),this.#r(),{dim:!0});return R`
      <div class="compare-text">
        ${nn({metric:j.i18n.lockedString(this.#t.metric),rating:s,compare:t,localValue:o})}
      </div>
    `}#b(){let e=this.#v();if(!e||e==="similar")return le.nothing;let t=[],s=this.#t.metric;return s==="LCP"&&e==="better"?t.push(x(b.recThrottlingLCP)):s==="INP"&&e==="better"&&t.push(x(b.recThrottlingINP)),s==="LCP"?t.push(x(b.recViewportLCP)):s==="CLS"&&t.push(x(b.recViewportCLS)),s==="CLS"?t.push(x(b.recJourneyCLS)):s==="INP"&&t.push(x(b.recJourneyINP)),s==="LCP"?t.push(x(b.recDynamicContentLCP)):s==="CLS"&&t.push(x(b.recDynamicContentCLS)),t.length?R`
      <details class="environment-recs">
        <summary>${x(b.considerTesting)}</summary>
        <ul class="environment-recs-list">${t.map(o=>R`<li>${o}</li>`)}</ul>
      </details>
    `:le.nothing}#h(e){return`timeline.landing.${e?"local":"field"}-${this.#t.metric.toLowerCase()}`}#w(){let e=this.#p();if(e===void 0)return this.#t.metric==="INP"?R`
          <div class="detailed-compare-text">${x(b.interactToMeasure)}</div>
        `:le.nothing;let t=Se(e,this.#c()),s=this.#f(),o=s!==void 0?Se(s,this.#c()):void 0,n=ne(this.#h(!0),e,this.#c(),this.#r(),{dim:!0}),r=ne(this.#h(!1),s,this.#c(),this.#r(),{dim:!0});return R`
      <div class="detailed-compare-text">${rn({metric:j.i18n.lockedString(this.#t.metric),localRating:t,fieldRating:o,localValue:n,fieldValue:r,percent:this.#S(t)})}</div>
    `}#x(e){switch(e){case"good":return 0;case"needs-improvement":return 1;case"poor":return 2}}#g(e){let s=this.#t.histogram?.[this.#x(e)].density||0;return`${Math.round(s*100)}%`}#S(e){let t=this.#t.histogram;if(t===void 0)return"-";let s=t[this.#x(e)].density||0,o=Math.round(s*100);return x(b.percentage,{PH1:o})}#T(){let e=as.CrUXManager.instance().getConfigSetting().get().enabled,t=this.#r(),s=this.#c(),o=R`
      <div class="bucket-label">
        <span>${x(b.good)}</span>
        <span class="bucket-range"> ${x(b.leqRange,{PH1:t(s[0])})}</span>
      </div>
    `,n=R`
      <div class="bucket-label">
        <span>${x(b.needsImprovement)}</span>
        <span class="bucket-range"> ${x(b.betweenRange,{PH1:t(s[0]),PH2:t(s[1])})}</span>
      </div>
    `,r=R`
      <div class="bucket-label">
        <span>${x(b.poor)}</span>
        <span class="bucket-range"> ${x(b.gtRange,{PH1:t(s[1])})}</span>
      </div>
    `;return e?R`
      <div class="bucket-summaries histogram">
        ${o}
        <div class="histogram-bar good-bg" style="width: ${this.#g("good")}"></div>
        <div class="histogram-percent">${this.#S("good")}</div>
        ${n}
        <div class="histogram-bar needs-improvement-bg" style="width: ${this.#g("needs-improvement")}"></div>
        <div class="histogram-percent">${this.#S("needs-improvement")}</div>
        ${r}
        <div class="histogram-bar poor-bg" style="width: ${this.#g("poor")}"></div>
        <div class="histogram-percent">${this.#S("poor")}</div>
      </div>
    `:R`
        <div class="bucket-summaries">
          ${o}
          ${n}
          ${r}
        </div>
      `}#C(e){let t=e.every(s=>s[2]!==void 0);return R`
      <hr class="divider">
      <div class="phase-table" role="table">
        <div class="phase-table-row phase-table-header-row" role="row">
          <div role="columnheader" style="grid-column: 1">${x(b.phase)}</div>
          <div role="columnheader" class="phase-table-value" style="grid-column: 2">${x(b.localValue)}</div>
          ${t?R`
            <div
              role="columnheader"
              class="phase-table-value"
              style="grid-column: 3"
              title=${x(b.field75thPercentile)}>${x(b.fieldP75)}</div>
          `:rt}
        </div>
        ${e.map(s=>R`
          <div class="phase-table-row" role="row">
            <div role="cell">${s[0]}</div>
            <div role="cell" class="phase-table-value">${j.TimeUtilities.preciseMillisToString(s[1])}</div>
            ${s[2]!==void 0?R`
              <div role="cell" class="phase-table-value">${j.TimeUtilities.preciseMillisToString(s[2])}</div>
            `:rt}
          </div>
        `)}
      </div>
    `}#k=()=>{let e=as.CrUXManager.instance().getConfigSetting().get().enabled,t=this.#m(),s=this.#p(),o=this.#f(),n=this.#c(),r=this.#r(),a=ne(this.#h(!0),s,n,r),l=ne(this.#h(!1),o,n,r),c=R`
      <style>${sn}</style>
      <style>${$t}</style>
      <div class="metric-card">
        <h3 class="title">
          ${this.#d()}
          <devtools-button
            class="title-help"
            title=${this.#u()}
            .iconName=${"help"}
            .variant=${"icon"}
            @click=${()=>ln.openInNewTab(t)}
          ></devtools-button>
        </h3>
        <div tabindex="0" class="metric-values-section"
          @mouseenter=${()=>this.#l(500)}
          @mouseleave=${this.#n}
          @focusin=${this.#l}
          @focusout=${this.#o}
          aria-describedby="tooltip"
        >
          <div class="metric-source-block">
            <div class="metric-source-value" id="local-value">${a}</div>
            ${e?R`<div class="metric-source-label">${x(b.localValue)}</div>`:rt}
          </div>
          ${e?R`
            <div class="metric-source-block">
              <div class="metric-source-value" id="field-value">${l}</div>
              <div class="metric-source-label">${x(b.field75thPercentile)}</div>
            </div>
          `:rt}
          <div
            id="tooltip"
            class="tooltip"
            role="tooltip"
            aria-label=${x(b.viewCardDetails)}
            ${le.Directives.ref(u=>{u instanceof HTMLElement&&(this.#e=u)})}
          >
            <div class="tooltip-scroll">
              <div class="tooltip-contents">
                <div>
                  ${this.#w()}
                  <hr class="divider">
                  ${this.#T()}
                  ${s&&this.#t.phases?this.#C(this.#t.phases):rt}
                </div>
              </div>
            </div>
          </div>
        </div>
        ${e?R`<hr class="divider">`:rt}
        ${this.#y()}
        ${this.#t.warnings?.map(u=>R`
          <div class="warning">${u}</div>
        `)}
        ${this.#b()}
        <slot name="extra-info"></slot>
      </div>
    `;le.render(c,this.#i,{host:this})}};customElements.define("devtools-metric-card",yi);import*as bi from"./../../../core/common/common.js";import*as ct from"./../../../core/i18n/i18n.js";import*as pn from"./../../../core/root/root.js";import*as hn from"./../../../core/sdk/sdk.js";import*as at from"./../../../models/crux-manager/crux-manager.js";import*as fn from"./../../../models/emulation/emulation.js";import*as Pt from"./../../../models/live-metrics/live-metrics.js";import*as It from"./../../../models/trace/trace.js";import"./../../../ui/components/buttons/buttons.js";import*as Mt from"./../../../ui/i18n/i18n.js";import*as Z from"./../../../ui/legacy/legacy.js";import*as O from"./../../../ui/lit/lit.js";import*as ps from"./../../../ui/visual_logging/visual_logging.js";import*as _e from"./../../common/common.js";var cs=`.container{container-type:inline-size;height:100%;font-size:var(--sys-typescale-body4-size);line-height:var(--sys-typescale-body4-line-height);font-weight:var(--ref-typeface-weight-regular);user-select:text}.live-metrics-view{--min-main-area-size:60%;background-color:var(--sys-color-cdt-base-container);display:flex;flex-direction:row;width:100%;height:100%}.live-metrics,
.next-steps{padding:16px;height:100%;overflow-y:auto;box-sizing:border-box}.live-metrics{flex:1;display:flex;flex-direction:column}.live-metrics > *{flex-shrink:0}.next-steps{flex:0 0 336px;box-sizing:border-box;border:none;border-left:1px solid var(--sys-color-divider)}@container (max-width: 650px){.live-metrics-view{flex-direction:column}.next-steps{flex-basis:40%;border:none;border-top:1px solid var(--sys-color-divider)}}.metric-cards{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));width:100%}.section-title{font-size:var(--sys-typescale-headline4-size);line-height:var(--sys-typescale-headline4-line-height);font-weight:var(--ref-typeface-weight-medium);margin:0;margin-bottom:10px}.settings-card{border-radius:var(--sys-shape-corner-small);padding:14px 16px 16px;background-color:var(--sys-color-surface3);margin-bottom:16px}.record-action-card{border-radius:var(--sys-shape-corner-small);padding:12px 16px 12px 12px;background-color:var(--sys-color-surface3);margin-bottom:16px}.card-title{font-size:var(--sys-typescale-headline5-size);line-height:var(--sys-typescale-headline5-line-height);font-weight:var(--ref-typeface-weight-medium);margin:0}.settings-card .card-title{margin-bottom:4px}.device-toolbar-description{margin-bottom:12px;display:flex}.network-cache-setting{display:inline-block;max-width:max-content}.throttling-recommendation-value{font-weight:var(--ref-typeface-weight-medium)}.related-info{text-wrap:nowrap;margin-top:8px;display:flex}.related-info-label{font-weight:var(--ref-typeface-weight-medium);margin-right:4px}.related-info-link{background-color:var(--sys-color-cdt-base-container);border-radius:2px;padding:0 2px;min-width:0}.local-field-link{display:inline-block;width:fit-content;margin-top:8px}.logs-section{margin-top:24px;display:flex;flex-direction:column;flex:1 0 300px;overflow:hidden;max-height:max-content;--app-color-toolbar-background:transparent}.logs-section-header{display:flex;align-items:center}.interactions-clear{margin-left:4px;vertical-align:sub}.log{padding:0;margin:0;overflow:auto}.log-item{border:none;border-bottom:1px solid var(--sys-color-divider);&.highlight{animation:highlight-fadeout 2s}}.interaction{--phase-table-margin:120px;--details-indicator-width:18px;summary{display:flex;align-items:center;padding:7px 4px;&::before{content:" ";height:14px;width:var(--details-indicator-width);mask-image:var(--image-file-triangle-right);background-color:var(--icon-default);flex-shrink:0}}details[open] summary::before{mask-image:var(--image-file-triangle-down)}}.interaction-type{font-weight:var(--ref-typeface-weight-medium);width:calc(var(--phase-table-margin) - var(--details-indicator-width));flex-shrink:0}.interaction-inp-chip{background-color:var(--sys-color-yellow-bright);color:var(--sys-color-on-yellow);padding:0 2px}.interaction-node{flex-grow:1;margin-right:32px;min-width:0}.interaction-info{width:var(--sys-typescale-body4-line-height);height:var(--sys-typescale-body4-line-height);margin-right:6px}.interaction-duration{text-align:end;width:max-content;flex-shrink:0;font-weight:var(--ref-typeface-weight-medium)}.layout-shift{display:flex;align-items:flex-start}.layout-shift-score{margin-right:16px;padding:7px 0;width:150px;box-sizing:border-box}.layout-shift-nodes{flex:1;min-width:0}.layout-shift-node{border-bottom:1px solid var(--sys-color-divider);padding:7px 0;&:last-child{border:none}}.record-action{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:8px}.shortcut-label{width:max-content;flex-shrink:0}.field-data-option{margin:8px 0;max-width:100%}.field-setup-buttons{margin-top:14px}.field-data-message{margin-bottom:12px}.field-data-warning{margin-top:4px;color:var(--sys-color-error);font-size:var(--sys-typescale-body4-size);line-height:var(--sys-typescale-body4-line-height);display:flex;&::before{content:" ";width:var(--sys-typescale-body4-line-height);height:var(--sys-typescale-body4-line-height);mask-size:var(--sys-typescale-body4-line-height);mask-image:var(--image-file-warning);background-color:var(--sys-color-error);margin-right:4px;flex-shrink:0}}.collection-period-range{font-weight:var(--ref-typeface-weight-medium)}devtools-link{color:var(--sys-color-primary);text-decoration-line:underline}.environment-option{display:flex;align-items:center;margin-top:8px}.environment-recs-list{margin:0;padding-left:20px}.environment-rec{font-weight:var(--ref-typeface-weight-medium)}.link-to-log{padding:unset;background:unset;border:unset;font:inherit;color:var(--sys-color-primary);text-decoration:underline;cursor:pointer}@keyframes highlight-fadeout{from{background-color:var(--sys-color-yellow-container)}to{background-color:transparent}}.phase-table{border-top:1px solid var(--sys-color-divider);padding:7px 4px;margin-left:var(--phase-table-margin)}.phase-table-row{display:flex;justify-content:space-between}.phase-table-header-row{font-weight:var(--ref-typeface-weight-medium);margin-bottom:4px}.log-extra-details-button{padding:unset;background:unset;border:unset;font:inherit;color:var(--sys-color-primary);text-decoration:underline;cursor:pointer}.node-view{display:flex;align-items:center;justify-content:center;height:100%;font-size:var(--sys-typescale-body4-size);line-height:var(--sys-typescale-body4-line-height);font-weight:var(--ref-typeface-weight-regular);user-select:text;main{width:300px;max-width:100%;text-align:center;.section-title{margin-bottom:4px}}}.node-description{margin-bottom:12px}
/*# sourceURL=${import.meta.resolve("./liveMetricsView.css")} */`;var{html:v,nothing:lt,Directives:{live:dn}}=O,{widget:Ut}=Z.Widget,ia=["AUTO",...at.DEVICE_SCOPE_LIST],sa=60,d={localAndFieldMetrics:"Local and field metrics",localMetrics:"Local metrics",fieldDataHistoryLink:"View history",fieldDataHistoryTooltip:"View field data history in CrUX Vis",eventLogs:"Interaction and layout shift logs section",interactions:"Interactions",layoutShifts:"Layout shifts",nextSteps:"Next steps",fieldMetricsTitle:"Field metrics",environmentSettings:"Environment settings",showFieldDataForDevice:"Show field metrics for device type: {PH1}",notEnoughData:"Not enough data",network:"Network: {PH1}",device:"Device: {PH1}",allDevices:"All devices",desktop:"Desktop",mobile:"Mobile",tablet:"Tablet",auto:"Auto ({PH1})",loadingOption:"{PH1} - Loading\u2026",needsDataOption:"{PH1} - No data",urlOption:"URL",originOption:"Origin",urlOptionWithKey:"URL: {PH1}",originOptionWithKey:"Origin: {PH1}",showFieldDataForPage:"Show field metrics for {PH1}",tryDisablingThrottling:"75th percentile is too fast to simulate with throttling",tryUsingThrottling:"75th percentile is similar to {PH1} throttling",percentDevices:"{PH1}% mobile, {PH2}% desktop",useDeviceToolbar:"Use the [device toolbar](https://developer.chrome.com/docs/devtools/device-mode) and configure throttling to simulate real user environments and identify more performance issues.",disableNetworkCache:"Disable network cache",lcpElement:"LCP element",inpInteractionLink:"INP interaction",worstCluster:"Worst cluster",numShifts:`{shiftCount, plural,
    =1 {{shiftCount} shift}
    other {{shiftCount} shifts}
  }`,collectionPeriod:"Collection period: {PH1}",dateRange:"{PH1} - {PH2}",seeHowYourLocalMetricsCompare:"See how your local metrics compare to real user data in the {PH1}.",localFieldLearnMoreLink:"Learn more about local and field metrics",localFieldLearnMoreTooltip:"Local metrics are captured from the current page using your network connection and device. field metrics is measured by real users using many different network connections and devices.",interactionExcluded:"INP is calculated using the 98th percentile of interaction delays, so some interaction delays may be larger than the INP value.",clearCurrentLog:"Clear the current log",timeToFirstByte:"Time to first byte",resourceLoadDelay:"Resource load delay",resourceLoadDuration:"Resource load duration",elementRenderDelay:"Element render delay",inputDelay:"Input delay",processingDuration:"Processing duration",presentationDelay:"Presentation delay",inpInteraction:"The INP interaction is at the 98th percentile of interaction delays.",showInpInteraction:"Go to the INP interaction.",showClsCluster:"Go to worst layout shift cluster.",phase:"Phase",duration:"Local duration (ms)",logToConsole:"Log additional interaction data to the console",nodePerformanceTimeline:"Node performance",nodeClickToRecord:"Record a performance timeline of the connected Node process."},Dt=ct.i18n.registerUIStrings("panels/timeline/components/LiveMetricsView.ts",d),m=ct.i18n.getLocalizedString.bind(void 0,Dt);function oa(i){let e=i.getSelectedFieldMetricData("largest_contentful_paint_image_time_to_first_byte")?.percentiles?.p75,t=i.getSelectedFieldMetricData("largest_contentful_paint_image_resource_load_delay")?.percentiles?.p75,s=i.getSelectedFieldMetricData("largest_contentful_paint_image_resource_load_duration")?.percentiles?.p75,o=i.getSelectedFieldMetricData("largest_contentful_paint_image_element_render_delay")?.percentiles?.p75;return typeof e!="number"||typeof t!="number"||typeof s!="number"||typeof o!="number"?null:{timeToFirstByte:It.Types.Timing.Milli(e),resourceLoadDelay:It.Types.Timing.Milli(t),resourceLoadTime:It.Types.Timing.Milli(s),elementRenderDelay:It.Types.Timing.Milli(o)}}function na(i){let e=i.getSelectedFieldMetricData("round_trip_time");if(!e?.percentiles)return null;let t=Number(e.percentiles.p75);if(!Number.isFinite(t))return null;if(t<sa)return m(d.tryDisablingThrottling);let s=hn.NetworkManager.getRecommendedNetworkPreset(t);if(!s)return null;let o=typeof s.title=="function"?s.title():s.title;return m(d.tryUsingThrottling,{PH1:o})}function ra(i){let e=i.getFieldResponse(i.fieldPageScope,"ALL")?.record.metrics.form_factors?.fractions;return e?m(d.percentDevices,{PH1:Math.round(e.phone*100),PH2:Math.round(e.desktop*100)}):null}function mn(i,e){let t=i.pageResult?.[`${e}-ALL`]?.record.key[e];if(t)return e==="url"?m(d.urlOptionWithKey,{PH1:t}):m(d.originOptionWithKey,{PH1:t});let s=m(e==="url"?d.urlOption:d.originOption);return m(d.needsDataOption,{PH1:s})}function un(i){switch(i){case"ALL":return m(d.allDevices);case"DESKTOP":return m(d.desktop);case"PHONE":return m(d.mobile);case"TABLET":return m(d.tablet)}}function gn(i,e){let t;if(e==="AUTO"){let o=i.resolveDeviceOptionToScope(e),n=un(o);t=m(d.auto,{PH1:n})}else t=un(e);return i.pageResult?i.getSelectedFieldResponse()?t:m(d.needsDataOption,{PH1:t}):m(d.loadingOption,{PH1:t})}function aa(i){let e=i.getSelectedFieldResponse();if(!e)return null;let{firstDate:t,lastDate:s}=e.record.collectionPeriod,o=new Date(t.year,t.month-1,t.day),n=new Date(s.year,s.month-1,s.day),r={year:"numeric",month:"short",day:"numeric"};return m(d.dateRange,{PH1:o.toLocaleDateString(void 0,r),PH2:n.toLocaleDateString(void 0,r)})}function hs(i){return O.Directives.ref(e=>{e instanceof HTMLElement&&(e.data={...i,tooltipContainer:e.closest(".metric-cards")||void 0})})}function la(i){let e=i.cruxManager.getSelectedFieldMetricData("largest_contentful_paint"),t=i.lcpValue?.nodeRef&&_e.DOMLinkifier.Linkifier.instance().linkify(i.lcpValue?.nodeRef),s=i.lcpValue?.phases,o=oa(i.cruxManager);return v`
    <devtools-metric-card ${hs({metric:"LCP",localValue:i.lcpValue?.value,fieldValue:e?.percentiles?.p75,histogram:e?.histogram,warnings:i.lcpValue?.warnings,phases:s&&[[m(d.timeToFirstByte),s.timeToFirstByte,o?.timeToFirstByte],[m(d.resourceLoadDelay),s.resourceLoadDelay,o?.resourceLoadDelay],[m(d.resourceLoadDuration),s.resourceLoadTime,o?.resourceLoadTime],[m(d.elementRenderDelay),s.elementRenderDelay,o?.elementRenderDelay]]})}>
      ${t?v`
          <div class="related-info" slot="extra-info">
            <span class="related-info-label">${m(d.lcpElement)}</span>
            <span class="related-info-link">
             ${Ut(_e.DOMLinkifier.DOMNodeLink,{node:i.lcpValue?.nodeRef})}
            </span>
          </div>
        `:lt}
    </devtools-metric-card>
  `}function ca(i){let e=i.cruxManager.getSelectedFieldMetricData("cumulative_layout_shift"),t=new Set(i.clsValue?.clusterShiftIds||[]),s=t.size>0&&i.layoutShifts.some(o=>t.has(o.uniqueLayoutShiftId));return v`
    <devtools-metric-card ${hs({metric:"CLS",localValue:i.clsValue?.value,fieldValue:e?.percentiles?.p75,histogram:e?.histogram,warnings:i.clsValue?.warnings})}>
      ${s?v`
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${m(d.worstCluster)}</span>
          <button
            class="link-to-log"
            title=${m(d.showClsCluster)}
            @click=${()=>i.revealLayoutShiftCluster(t)}
            jslog=${ps.action("timeline.landing.show-cls-cluster").track({click:!0})}
          >${m(d.numShifts,{shiftCount:t.size})}</button>
        </div>
      `:lt}
    </devtools-metric-card>
  `}function da(i){let e=i.cruxManager.getSelectedFieldMetricData("interaction_to_next_paint"),t=i.inpValue?.phases,s=i.inpValue&&i.interactions.get(i.inpValue.interactionId);return v`
    <devtools-metric-card ${hs({metric:"INP",localValue:i.inpValue?.value,fieldValue:e?.percentiles?.p75,histogram:e?.histogram,warnings:i.inpValue?.warnings,phases:t&&[[m(d.inputDelay),t.inputDelay],[m(d.processingDuration),t.processingDuration],[m(d.presentationDelay),t.presentationDelay]]})}>
      ${s?v`
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${m(d.inpInteractionLink)}</span>
          <button
            class="link-to-log"
            title=${m(d.showInpInteraction)}
            @click=${()=>i.revealInteraction(s)}
            jslog=${ps.action("timeline.landing.show-inp-interaction").track({click:!0})}
          >${s.interactionType}</button>
        </div>
      `:lt}
    </devtools-metric-card>
  `}function ds(i){function e(){i.execute()}return v`
    <div class="record-action">
      <devtools-button @click=${e} .data=${{variant:"text",size:"REGULAR",iconName:i.icon(),title:i.title(),jslogContext:i.id()}}>
        ${i.title()}
      </devtools-button>
      <span class="shortcut-label">${Z.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(i.id())}</span>
    </div>
  `}function ma(i){let e=i.cruxManager.getConfigSetting().get().enabled,t=ra(i.cruxManager)||m(d.notEnoughData),s=na(i.cruxManager)||m(d.notEnoughData),o=_e.ThrottlingUtils.getThrottlingRecommendations();return v`
    <h3 class="card-title">${m(d.environmentSettings)}</h3>
    <div class="device-toolbar-description">${Zt(m(d.useDeviceToolbar))}</div>
    ${e?v`
      <ul class="environment-recs-list">
        <li>${Mt.getFormatLocalizedStringTemplate(Dt,d.device,{PH1:v`<span class="environment-rec">${t}</span>`})}</li>
        <li>${Mt.getFormatLocalizedStringTemplate(Dt,d.network,{PH1:v`<span class="environment-rec">${s}</span>`})}</li>
      </ul>
    `:lt}
    <div class="environment-option">
      ${Ut(vt,{recommendedOption:o.cpuOption})}
    </div>
    <div class="environment-option">
      <devtools-network-throttling-selector .recommendedConditions=${o.networkConditions}></devtools-network-throttling-selector>
    </div>
    <div class="environment-option">
      <setting-checkbox
        class="network-cache-setting"
        .data=${{setting:bi.Settings.Settings.instance().moduleSetting("cache-disabled"),textOverride:m(d.disableNetworkCache)}}
      ></setting-checkbox>
    </div>
  `}function ua(i){if(!i.cruxManager.getConfigSetting().get().enabled)return O.nothing;let e=mn(i.cruxManager,"url"),t=mn(i.cruxManager,"origin"),s=i.cruxManager.fieldPageScope==="url"?e:t,o=m(d.showFieldDataForPage,{PH1:s}),n=!i.cruxManager.pageResult?.["url-ALL"]&&!i.cruxManager.pageResult?.["origin-ALL"];return v`
    <devtools-select-menu
      id="page-scope-select"
      class="field-data-option"
      @selectmenuselected=${i.handlePageScopeSelected}
      .showDivider=${!0}
      .showArrow=${!0}
      .sideButton=${!1}
      .showSelectedItem=${!0}
      .buttonTitle=${s}
      .disabled=${n}
      title=${o}
    >
      <devtools-menu-item
        .value=${"url"}
        .selected=${i.cruxManager.fieldPageScope==="url"}
      >
        ${e}
      </devtools-menu-item>
      <devtools-menu-item
        .value=${"origin"}
        .selected=${i.cruxManager.fieldPageScope==="origin"}
      >
        ${t}
      </devtools-menu-item>
    </devtools-select-menu>
  `}function ga(i){if(!i.cruxManager.getConfigSetting().get().enabled)return O.nothing;let e=!i.cruxManager.getFieldResponse(i.cruxManager.fieldPageScope,"ALL"),t=gn(i.cruxManager,i.cruxManager.fieldDeviceOption);return v`
    <devtools-select-menu
      id="device-scope-select"
      class="field-data-option"
      @selectmenuselected=${i.handleDeviceOptionSelected}
      .showDivider=${!0}
      .showArrow=${!0}
      .sideButton=${!1}
      .showSelectedItem=${!0}
      .buttonTitle=${m(d.device,{PH1:t})}
      .disabled=${e}
      title=${m(d.showFieldDataForDevice,{PH1:t})}
    >
      ${ia.map(s=>v`
          <devtools-menu-item
            .value=${s}
            .selected=${i.cruxManager.fieldDeviceOption===s}
          >
            ${gn(i.cruxManager,s)}
          </devtools-menu-item>
        `)}
    </devtools-select-menu>
  `}function pa(i){if(!i.getConfigSetting().get().enabled)return O.nothing;let e=i.pageResult?.normalizedUrl;if(!e)return O.nothing;let t=new URL("https://cruxvis.withgoogle.com/");t.searchParams.set("view","cwvsummary"),t.searchParams.set("url",e);let s=i.fieldPageScope;t.searchParams.set("identifier",s);let o=i.getSelectedDeviceScope();t.searchParams.set("device",o);let n=`${t.origin}/#/${t.search}`;return v`
      (<devtools-link href=${n}
               class="local-field-link"
               title=${m(d.fieldDataHistoryTooltip)}
      >${m(d.fieldDataHistoryLink)}</devtools-link>)
    `}function ha(i){let e=aa(i),t=e||m(d.notEnoughData),s=e?pa(i):O.nothing,o=i.pageResult?.warnings||[];return v`
    <div class="field-data-message">
      <div>${Mt.getFormatLocalizedStringTemplate(Dt,d.collectionPeriod,{PH1:v`<span class="collection-period-range">${t}</span>`})} ${s}</div>
      ${o.map(n=>v`
        <div class="field-data-warning">${n}</div>
      `)}
    </div>
  `}function fa(i){return i.getConfigSetting().get().enabled?ha(i):v`
    <div class="field-data-message">
      ${Mt.getFormatLocalizedStringTemplate(Dt,d.seeHowYourLocalMetricsCompare,{PH1:v`<devtools-link href="https://developer.chrome.com/docs/crux">${ct.i18n.lockedString("Chrome UX Report")}</devtools-link>`})}
    </div>
  `}var ms=new WeakMap;function vn(i){return i.checkVisibility()?Math.abs(i.scrollHeight-i.clientHeight-i.scrollTop)<=1||!!ms.get(i):!1}function yn(i){requestAnimationFrame(()=>{ms.set(i,!0),i.addEventListener("scrollend",()=>{ms.set(i,!1)},{once:!0}),i.scrollTo({top:i.scrollHeight,behavior:"smooth"})})}function va(i,e){return i.interactions.size?v`
    <ol class="log"
      slot="interactions-log-content"
      ${O.Directives.ref(t=>{t instanceof HTMLElement&&(e.shouldKeepInteractionsScrolledToBottom=()=>vn(t),e.keepInteractionsScrolledToBottom=()=>{yn(t)})})}
    >
      ${i.interactions.values().map(t=>{let s=ne("timeline.landing.interaction-event-timing",t.duration,it,r=>ct.TimeUtilities.preciseMillisToString(r),{dim:!0}),o=i.inpValue&&i.inpValue.value<t.duration,n=i.inpValue?.interactionId===t.interactionId;return v`
          <li id=${t.interactionId} class="log-item interaction" tabindex="-1">
            <details>
              <summary>
                <span class="interaction-type">
                  ${t.interactionType} ${n?v`<span class="interaction-inp-chip" title=${m(d.inpInteraction)}>INP</span>`:lt}
                </span>
                <span class="interaction-node">
                  ${Ut(_e.DOMLinkifier.DOMNodeLink,{node:t.nodeRef})}
                </span>
                ${o?v`<devtools-icon
                  class="interaction-info"
                  name="info"
                  title=${m(d.interactionExcluded)}
                ></devtools-icon>`:lt}
                <span class="interaction-duration">${s}</span>
              </summary>
              <div class="phase-table" role="table">
                <div class="phase-table-row phase-table-header-row" role="row">
                  <div role="columnheader">${m(d.phase)}</div>
                  <div role="columnheader">
                    ${t.longAnimationFrameTimings.length?v`
                      <button
                        class="log-extra-details-button"
                        title=${m(d.logToConsole)}
                        @click=${()=>i.logExtraInteractionDetails(t)}
                      >${m(d.duration)}</button>
                    `:m(d.duration)}
                  </div>
                </div>
                <div class="phase-table-row" role="row">
                  <div role="cell">${m(d.inputDelay)}</div>
                  <div role="cell">${Math.round(t.phases.inputDelay)}</div>
                </div>
                <div class="phase-table-row" role="row">
                  <div role="cell">${m(d.processingDuration)}</div>
                  <div role="cell">${Math.round(t.phases.processingDuration)}</div>
                </div>
                <div class="phase-table-row" role="row">
                  <div role="cell">${m(d.presentationDelay)}</div>
                  <div role="cell">${Math.round(t.phases.presentationDelay)}</div>
                </div>
              </div>
            </details>
          </li>
        `})}
    </ol>
  `:O.nothing}function ya(i,e){return i.layoutShifts.length?v`
    <ol class="log"
      slot="layout-shifts-log-content"
      ${O.Directives.ref(t=>{t instanceof HTMLElement&&(e.shouldKeepLayoutShiftsScrolledToBottom=()=>vn(t),e.keepLayoutShiftsScrolledToBottom=()=>{yn(t)})})}
    >
      ${i.layoutShifts.map(t=>{let s=ne("timeline.landing.layout-shift-event-score",t.score,tt,o=>o.toFixed(4),{dim:!0});return v`
          <li id=${t.uniqueLayoutShiftId} class="log-item layout-shift" tabindex="-1">
            <div class="layout-shift-score">Layout shift score: ${s}</div>
            <div class="layout-shift-nodes">
              ${t.affectedNodeRefs.map(o=>v`
                <div class="layout-shift-node">
                  ${Ut(_e.DOMLinkifier.DOMNodeLink,{node:o})}
                </div>
              `)}
            </div>
          </li>
        `})}
    </ol>
  `:O.nothing}function ba(i,e){return v`
    <section
      class="logs-section"
      aria-label=${m(d.eventLogs)}
    >
      <devtools-widget ${Ut(gs,{selectedTab:i.highlightedInteractionId?"interactions":i.highlightedLayoutShiftClusterIds?.size?"layout-shifts":void 0})}>
        ${va(i,e)}
        ${ya(i,e)}
      </devtools-widget>
    </section>
  `}function wa(i){return v`
    <style>${cs}</style>
    <style>${$t}</style>
    <div class="node-view">
      <main>
        <h2 class="section-title">${m(d.nodePerformanceTimeline)}</h2>
        <div class="node-description">${m(d.nodeClickToRecord)}</div>
        <div class="record-action-card">${ds(i.toggleRecordAction)}</div>
      </main>
    </div>
  `}var bn=(i,e,t)=>{if(i.isNode){O.render(wa(i),t);return}let s=i.cruxManager.getConfigSetting().get().enabled,o=m(s?d.localAndFieldMetrics:d.localMetrics),r=v`
    <style>${cs}</style>
    <style>${$t}</style>
    <div class="container">
      <div class="live-metrics-view">
        <main class="live-metrics">
          <h2 class="section-title">${o}</h2>
          <div class="metric-cards">
            <div id="lcp">
              ${la(i)}
            </div>
            <div id="cls">
              ${ca(i)}
            </div>
            <div id="inp">
              ${da(i)}
            </div>
          </div>
          <devtools-link
            href=${"https://web.dev/articles/lab-and-field-data-differences#lab_data_versus_field_data"}
            class="local-field-link"
            title=${m(d.localFieldLearnMoreTooltip)}
          >${m(d.localFieldLearnMoreLink)}</devtools-link>
          ${ba(i,e)}
        </main>
        <aside class="next-steps" aria-labelledby="next-steps-section-title">
          <h2 id="next-steps-section-title" class="section-title">${m(d.nextSteps)}</h2>
          <div id="field-setup" class="settings-card">
            <h3 class="card-title">${m(d.fieldMetricsTitle)}</h3>
            ${fa(i.cruxManager)}
            ${ua(i)}
            ${ga(i)}
            <div class="field-setup-buttons">
              <devtools-field-settings-dialog></devtools-field-settings-dialog>
            </div>
          </div>
          <div id="recording-settings" class="settings-card">
            ${ma(i)}
          </div>
          <div id="record" class="record-action-card">
            ${ds(i.toggleRecordAction)}
          </div>
          <div id="record-page-load" class="record-action-card">
            ${ds(i.recordReloadAction)}
          </div>
        </aside>
      </div>
    </div>
  `;if(O.render(r,t),i.highlightedInteractionId){let a=t.querySelector("#"+CSS.escape(i.highlightedInteractionId));a&&requestAnimationFrame(()=>{a.scrollIntoView({block:"center"}),a.focus(),Z.UIUtils.runCSSAnimationOnce(a,"highlight")})}if(i.highlightedLayoutShiftClusterIds?.size){let a=[];for(let l of i.highlightedLayoutShiftClusterIds){let c=t.querySelector("#"+CSS.escape(l));c&&a.push(c)}a.length&&requestAnimationFrame(()=>{a[0].scrollIntoView({block:"start"}),a[0].focus();for(let l of a)Z.UIUtils.runCSSAnimationOnce(l,"highlight")})}},us=class extends Z.Widget.Widget{isNode=pn.Runtime.Runtime.isNode();#i;#e;#t;#s=new Map;#n=[];#o="";#a=new Set;#l=at.CrUXManager.instance();#d;#c;#r;#m={};#u=fn.DeviceModeModel.DeviceModeModel.tryInstance();constructor(e,t=bn){super(e,{useShadowDom:!0}),this.#r=t,this.#d=Z.ActionRegistry.ActionRegistry.instance().getAction("timeline.toggle-recording"),this.#c=Z.ActionRegistry.ActionRegistry.instance().getAction("timeline.record-reload")}async#p(e){this.#i=e.data.lcp,this.#e=e.data.cls,this.#t=e.data.inp;let t=this.#n.length<e.data.layoutShifts.length;this.#n=[...e.data.layoutShifts];let s=this.#s.size<e.data.interactions.size;this.#s=new Map(e.data.interactions);let o=s&&this.#m.shouldKeepInteractionsScrolledToBottom?.(),n=t&&this.#m.shouldKeepLayoutShiftsScrolledToBottom?.();this.requestUpdate(),await this.updateComplete,o&&this.#m.keepInteractionsScrolledToBottom?.(),n&&this.#m.keepLayoutShiftsScrolledToBottom?.()}#f(){this.requestUpdate()}#v(){this.requestUpdate()}async#y(){this.isNode||await this.#l.refresh(),this.requestUpdate()}wasShown(){super.wasShown();let e=Pt.LiveMetrics.instance();e.addEventListener("status",this.#p,this);let t=at.CrUXManager.instance();t.addEventListener("field-data-changed",this.#f,this),this.#u?.addEventListener("Updated",this.#v,this),t.getConfigSetting().get().enabled&&this.#y(),this.#i=e.lcpValue,this.#e=e.clsValue,this.#t=e.inpValue,this.#s=e.interactions,this.#n=e.layoutShifts,this.requestUpdate()}willHide(){super.willHide(),Pt.LiveMetrics.instance().removeEventListener("status",this.#p,this),at.CrUXManager.instance().removeEventListener("field-data-changed",this.#f,this),this.#u?.removeEventListener("Updated",this.#v,this)}#b(e){e.itemValue==="url"?this.#l.fieldPageScope="url":this.#l.fieldPageScope="origin",this.requestUpdate()}#h(e){this.#l.fieldDeviceOption=e.itemValue,this.requestUpdate()}async#w(e){this.#o=e.interactionId,this.requestUpdate(),await this.updateComplete,this.#o=""}async#x(e){await Pt.LiveMetrics.instance().logInteractionScripts(e)&&await bi.Console.Console.instance().showPromise()}async#g(e){this.#a=e,this.requestUpdate(),await this.updateComplete,this.#a=new Set}performUpdate(){let e={isNode:this.isNode,lcpValue:this.#i,clsValue:this.#e,inpValue:this.#t,interactions:this.#s,layoutShifts:this.#n,toggleRecordAction:this.#d,recordReloadAction:this.#c,cruxManager:this.#l,handlePageScopeSelected:this.#b.bind(this),handleDeviceOptionSelected:this.#h.bind(this),revealLayoutShiftCluster:this.#g.bind(this),revealInteraction:this.#w.bind(this),logExtraInteractionDetails:this.#x.bind(this),highlightedInteractionId:this.#o,highlightedLayoutShiftClusterIds:this.#a};this.#r(e,this.#m,this.contentElement)}},xa=(i,e,t)=>{O.render(v`
    <style>
      /* Any children of the root element will be matched to the slots defined within the container
         widget's shadow DOM. */
      :host,
      .widget {
        display: contents;
      }
    </style>
    <devtools-tabbed-pane @select=${s=>i.onTabSelected(s.detail.tabId)}>
      <devtools-toolbar slot="right">
        <devtools-button .iconName=${"clear"} .variant=${"toolbar"}
                         title=${m(d.clearCurrentLog)} @click=${i.onClear}
                         .jslogContext=${"timeline.landing.clear-log"}>
        </devtools-button>
      </devtools-toolbar>
      <!-- Taking advantage of web component slots allows us to render updates in the lit templates defined in the
      main component. This should be more performant and doesn't require us to inject live metrics styles twice. -->
      <slot name="interactions-log-content" id="interactions" ?selected=${dn(i.selectedTab==="interactions")}
            title=${m(d.interactions)} jslogcontext="timeline.landing.interactions-log">
      </slot>
      <slot name="layout-shifts-log-content" id="layout-shifts" ?selected=${dn(i.selectedTab==="layout-shifts")}
            title=${m(d.layoutShifts)} jslogcontext="timeline.landing.layout-shifts-log">
      </slot>
    </devtools-tabbed-pane>
  `,t)},gs=class extends Z.Widget.Widget{#i;#e="interactions";set selectedTab(e){!e||this.#e===e||(this.#e=e,this.requestUpdate())}#t(){let e=Pt.LiveMetrics.instance();switch(this.#e){case"interactions":e.clearInteractions();break;case"layout-shifts":e.clearLayoutShifts();break}}constructor(e,t=xa){super(e,{useShadowDom:!0}),this.#i=t,this.requestUpdate()}performUpdate(){let e={onClear:this.#t.bind(this),selectedTab:this.#e,onTabSelected:t=>{this.selectedTab=t}};this.#i(e,void 0,this.contentElement)}};var Mn={};L(Mn,{DEFAULT_VIEW:()=>Pn,NetworkRequestDetails:()=>vs});import"./../../../ui/components/request_link_icon/request_link_icon.js";import*as mt from"./../../../core/i18n/i18n.js";import*as Si from"./../../../core/sdk/sdk.js";import*as In from"./../../../models/trace/helpers/helpers.js";import*as We from"./../../../models/trace/trace.js";import*as Et from"./../../../ui/legacy/components/utils/utils.js";import*as Ti from"./../../../ui/legacy/legacy.js";import*as B from"./../../../ui/lit/lit.js";var xn=`@scope to (devtools-widget > *){.network-request-details-title{font-size:13px;padding:8px;display:flex;align-items:center}.network-request-details-title > div{box-sizing:border-box;width:14px;height:14px;border:1px solid var(--sys-color-divider);display:inline-block;margin-right:4px}.network-request-details-content{border-bottom:1px solid var(--sys-color-divider)}.network-request-details-cols{display:flex;justify-content:space-between;width:fit-content}:host{display:contents}.network-request-details-col{max-width:300px}.column-divider{border-left:1px solid var(--sys-color-divider)}.network-request-details-col.server-timings{display:grid;grid-template-columns:1fr 1fr 1fr;width:fit-content;width:450px;gap:0}.network-request-details-item, .network-request-details-col{padding:5px 10px}.server-timing-column-header{font-weight:var(--ref-typeface-weight-medium)}.network-request-details-row{min-height:min-content;display:flex;justify-content:space-between}.title{color:var(--sys-color-token-subtle);overflow:hidden;padding-right:10px;display:inline-block;vertical-align:top}.value{display:inline-block;user-select:text;text-overflow:ellipsis;overflow:hidden;&.synthetic{font-style:italic}}.focusable-outline{overflow:visible}.devtools-link,
  .timeline-link{color:var(--text-link);text-decoration:underline;outline-offset:2px;padding:0;text-align:left;.elements-disclosure &{color:var(--text-link)}devtools-icon{vertical-align:baseline;color:var(--sys-color-primary)}:focus .selected & devtools-icon{color:var(--sys-color-tonal-container)}&:focus-visible{outline-width:unset}&.invalid-link{color:var(--text-disabled);text-decoration:none}&:not(.devtools-link-prevent-click, .invalid-link){cursor:pointer}@media (forced-colors: active){&:not(.devtools-link-prevent-click){forced-color-adjust:none;color:linktext}&:focus-visible{background:Highlight;color:HighlightText}}}.text-button.link-style,
  .text-button.link-style:hover,
  .text-button.link-style:active{background:none;border:none;font:inherit}}
/*# sourceURL=${import.meta.resolve("./networkRequestDetails.css")} */`;var wi=`@scope to (devtools-widget > *){.bold{font-weight:bold}.url{margin-left:15px;margin-right:5px}.url--host{color:var(--sys-color-token-subtle)}.priority-row{margin-left:15px}.throttled-row{margin-left:15px;color:var(--sys-color-yellow)}.network-category-chip{box-sizing:border-box;width:10px;height:10px;border:1px solid var(--sys-color-divider);display:inline-block;margin-right:4px}devtools-icon.priority{height:13px;width:13px;color:var(--sys-color-on-surface-subtle)}.render-blocking{margin-left:15px;color:var(--sys-color-error)}.divider{border-top:1px solid var(--sys-color-divider);margin:5px 0}.timings-row{align-self:start;display:flex;align-items:center}.indicator{display:inline-block;width:12px;height:6px;margin-right:5px;border:1px solid var(--sys-color-on-surface-subtle);box-sizing:border-box}devtools-icon.indicator{vertical-align:middle;height:12px;width:12px;margin-right:4px;color:var(--sys-color-yellow);border:none}.whisker-left{align-self:center;display:inline-flex;width:11px;height:6px;margin-right:5px;border-left:1px solid var(--sys-color-on-surface-subtle);box-sizing:border-box}.whisker-right{align-self:center;display:inline-flex;width:11px;height:6px;margin-right:5px;border-right:1px solid var(--sys-color-on-surface-subtle);box-sizing:border-box}.horizontal{background-color:var(--sys-color-on-surface-subtle);height:1px;width:10px;align-self:center}.time{margin-left:auto;display:inline-block;padding-left:10px}.timings-row--duration{.indicator{border-color:transparent}.time{font-weight:var(--ref-typeface-weight-medium)}&.throttled{color:var(--sys-color-yellow)}}.redirects-row{margin-left:15px}}
/*# sourceURL=${import.meta.resolve("./networkRequestTooltip.css")} */`;var Ln={};L(Ln,{DEFAULT_VIEW:()=>Cn,NetworkRequestTooltip:()=>de});import"./../../../ui/kit/kit.js";import*as ve from"./../../../core/i18n/i18n.js";import*as Sn from"./../../../core/platform/platform.js";import*as dt from"./../../../core/sdk/sdk.js";import*as Tn from"./../../../models/trace/trace.js";import*as xi from"./../../../ui/legacy/components/perf_ui/perf_ui.js";import*as fs from"./../../../ui/legacy/legacy.js";import*as me from"./../../../ui/lit/lit.js";import*as kn from"./../utils/utils.js";var{html:_,nothing:Sa,Directives:{classMap:Ta,ifDefined:ka}}=me,{widget:Ca}=fs.Widget,La=60,ee={priority:"Priority",duration:"Duration",queuingAndConnecting:"Queuing and connecting",requestSentAndWaiting:"Request sent and waiting",contentDownloading:"Content downloading",waitingOnMainThread:"Waiting on main thread",renderBlocking:"Render-blocking",redirects:"Redirects",wasThrottled:"Request was throttled ({PH1})"},$a=ve.i18n.registerUIStrings("panels/timeline/components/NetworkRequestTooltip.ts",ee),ce=ve.i18n.getLocalizedString.bind(void 0,$a),Cn=(i,e,t)=>{let{networkRequest:s,entityMapper:o,throttlingTitle:n}=i,r={backgroundColor:`${et(s)}`},a=new URL(s.args.data.url),l=o?o.entityForEvent(s):null,c=kn.Helpers.formatOriginWithEntity(a,l,!0),u=de.renderRedirects(s);me.render(_`
    <style>${wi}</style>
    <div class="performance-card">
      <div class="url">${Sn.StringUtilities.trimMiddle(a.href.replace(a.origin,""),La)}</div>
      <div class="url url--host">${c}</div>

      <div class="divider"></div>
      <div class="network-category">
        <span class="network-category-chip" style=${me.Directives.styleMap(r)}>
        </span>${Qt(s)}
      </div>
      <div class="priority-row">${ce(ee.priority)}: ${de.renderPriorityValue(s)}</div>
      ${n?_`
        <div class="throttled-row">
          ${ce(ee.wasThrottled,{PH1:n})}
        </div>`:Sa}
      ${Tn.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(s)?_`<div class="render-blocking"> ${ce(ee.renderBlocking)} </div>`:me.nothing}
      <div class="divider"></div>

      ${de.renderTimings(s)}

      ${u?_`
        <div class="divider"></div>
        ${u}
      `:me.nothing}
    </div>
  `,t)},de=class i extends fs.Widget.Widget{static createWidgetElement(e,t){return _`${Ca(i,{networkRequest:e,entityMapper:t})}`}#i;#e;#t;constructor(e,t=Cn){super(e,{useShadowDom:!0}),this.#i=t}set networkRequest(e){this.#e=e,this.requestUpdate()}set entityMapper(e){this.#t=e,this.requestUpdate()}static renderPriorityValue(e){return e.args.data.priority===e.args.data.initialPriority?_`${xi.NetworkPriorities.uiLabelForNetworkPriority(e.args.data.priority)}`:_`${xi.NetworkPriorities.uiLabelForNetworkPriority(e.args.data.initialPriority)}
        <devtools-icon name="arrow-forward" class="priority"></devtools-icon>
        ${xi.NetworkPriorities.uiLabelForNetworkPriority(e.args.data.priority)}`}static renderTimings(e){let t=e.args.data.syntheticData,s=t.sendStartTime-e.ts,o=t.downloadStart-t.sendStartTime,n=t.finishTime-t.downloadStart,r=e.ts+e.dur-t.finishTime,a=et(e),l={backgroundColor:`color-mix(in srgb, ${a}, hsla(0, 100%, 100%, 0.8))`},c={backgroundColor:a},u=dt.TraceObject.RevealableNetworkRequest.create(e),g=u&&dt.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(u.networkRequest),h=g?ce(ee.wasThrottled,{PH1:typeof g.conditions.title=="string"?g.conditions.title:g.conditions.title()}):void 0,w=_`<span class="whisker-left"> <span class="horizontal"></span> </span>`,T=_`<span class="whisker-right"> <span class="horizontal"></span> </span>`,f=Ta({"timings-row timings-row--duration":!0,throttled:!!g?.urlPattern});return _`
      <div
        class=${f}
        title=${ka(h)}>
        ${g?.urlPattern?_`<devtools-icon
          class=indicator
          name=watch
          ></devtools-icon>`:_`<span class="indicator"></span>`}
        ${ce(ee.duration)}
         <span class="time"> ${ve.TimeUtilities.formatMicroSecondsTime(e.dur)} </span>
      </div>
      <div class="timings-row">
        ${w}
        ${ce(ee.queuingAndConnecting)}
        <span class="time"> ${ve.TimeUtilities.formatMicroSecondsTime(s)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${me.Directives.styleMap(l)}></span>
        ${ce(ee.requestSentAndWaiting)}
        <span class="time"> ${ve.TimeUtilities.formatMicroSecondsTime(o)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${me.Directives.styleMap(c)}></span>
        ${ce(ee.contentDownloading)}
        <span class="time"> ${ve.TimeUtilities.formatMicroSecondsTime(n)} </span>
      </div>
      <div class="timings-row">
        ${T}
        ${ce(ee.waitingOnMainThread)}
        <span class="time"> ${ve.TimeUtilities.formatMicroSecondsTime(r)} </span>
      </div>
    `}static renderRedirects(e){let t=[];if(e.args.data.redirects.length>0){t.push(_`
        <div class="redirects-row">
          ${ce(ee.redirects)}
        </div>
      `);for(let s of e.args.data.redirects)t.push(_`<div class="redirects-row"> ${s.url}</div>`);return _`${t}`}return null}performUpdate(){if(!this.#e)return;let e=dt.TraceObject.RevealableNetworkRequest.create(this.#e),t=e&&dt.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(e.networkRequest),s;t&&(s=typeof t.conditions.title=="string"?t.conditions.title:t.conditions.title());let o={networkRequest:this.#e,entityMapper:this.#t,throttlingTitle:s};this.#i(o,void 0,this.contentElement)}};var{html:te,render:$n}=B,Ia=100,P={requestMethod:"Request method",protocol:"Protocol",priority:"Priority",encodedData:"Encoded data",decodedBody:"Decoded body",yes:"Yes",no:"No",networkRequest:"Network request",fromCache:"From cache",mimeType:"MIME type",FromMemoryCache:" (from memory cache)",FromCache:" (from cache)",FromPush:" (from push)",FromServiceWorker:" (from `service worker`)",initiatedBy:"Initiated by",blocking:"Blocking",inBodyParserBlocking:"In-body parser blocking",renderBlocking:"Render-blocking",entity:"3rd party",serverTiming:"Server timing",time:"Time",description:"Description"},Pa=mt.i18n.registerUIStrings("panels/timeline/components/NetworkRequestDetails.ts",P),H=mt.i18n.getLocalizedString.bind(void 0,Pa),vs=class extends Ti.Widget.Widget{#i;#e=null;#t=new WeakMap;#s=null;#n=null;#o=null;#a=null;#l=null;constructor(e,t=Pn){super(e),this.#i=t,this.requestUpdate()}set linkifier(e){this.#o=e,this.requestUpdate()}set parsedTrace(e){this.#l=e,this.requestUpdate()}set target(e){this.#n=e,this.requestUpdate()}set request(e){this.#e=e;for(let t of e.args.data.responseHeaders??[]){let s=t.name.toLocaleLowerCase();if(s==="server-timing"||s==="server-timing-test"){t.name="server-timing",this.#a=Si.ServerTiming.ServerTiming.parseHeaders([t]);break}}this.requestUpdate()}set entityMapper(e){this.#s=e,this.requestUpdate()}performUpdate(){this.#i({request:this.#e,previewElementsCache:this.#t,target:this.#n,entityMapper:this.#s,serverTimings:this.#a,linkifier:this.#o,parsedTrace:this.#l},{},this.contentElement)}},Pn=(i,e,t)=>{if(!i.request){$n(B.nothing,t);return}let{request:s}=i,{data:o}=s.args,n=de.renderRedirects(s);$n(te`
        <style>${xn}</style>
        <style>${wi}</style>

        <div class="network-request-details-content">
          ${Ma(i.request)}
          ${Da(i.request)}
          <div class="network-request-details-cols">
            ${B.Directives.until(Ua(i.request,i.target,i.previewElementsCache))}
            <div class="network-request-details-col">
              ${ye(H(P.requestMethod),o.requestMethod)}
              ${ye(H(P.protocol),o.protocol)}
              ${ye(H(P.priority),de.renderPriorityValue(s))}
              ${ye(H(P.mimeType),o.mimeType)}
              ${Ea(s)}
              ${ye(H(P.decodedBody),mt.ByteUtilities.bytesToString(s.args.data.decodedBodyLength))}
              ${Ra(s)}
              ${Ha(s)}
              ${Na(s,i.entityMapper)}
            </div>
            <div class="column-divider"></div>
            <div class="network-request-details-col">
              <div class="timing-rows">
                ${de.renderTimings(s)}
              </div>
            </div>
            ${Fa(i.serverTimings)}
            ${n?te`
              <div class="column-divider"></div>
              <div class="network-request-details-col redirect-details">
                ${n}
              </div>
            `:B.nothing}
            </div>
            ${Aa(s,i.parsedTrace,i.target,i.linkifier)}
          </div>
        </div>
     `,t)};function Ma(i){let e={backgroundColor:`${et(i)}`};return te`
    <div class="network-request-details-title">
      <div style=${B.Directives.styleMap(e)}></div>
      ${H(P.networkRequest)}
    </div>
  `}function Da(i){let e={tabStop:!0,showColumnNumber:!1,inlineFrameIndex:0,maxLength:Ia},t=Et.Linkifier.Linkifier.linkifyURL(i.args.data.url,e),s=Si.TraceObject.RevealableNetworkRequest.create(i);if(s){t.addEventListener("contextmenu",n=>{let r=new Ti.ContextMenu.ContextMenu(n);r.appendApplicableItems(s),r.show()});let o=te`
        ${t}
        <devtools-request-link-icon .data=${{request:s.networkRequest}}>
        </devtools-request-link-icon>
      `;return te`<div class="network-request-details-item">${o}</div>`}return te`<div class="network-request-details-item">${t}</div>`}async function Ua(i,e,t){if(!i.args.data.url||!e)return B.nothing;let s=i.args.data.url;if(!t.get(i)){let n={imageAltText:Et.ImagePreview.ImagePreview.defaultAltTextForImageURL(s),align:"start",hideFileData:!0},r=await Et.ImagePreview.ImagePreview.build(s,!1,n);r&&t.set(i,r)}let o=t.get(i);return o?te`
      <div class="network-request-details-col">${o}</div>
      <div class="column-divider"></div>`:B.nothing}function ye(i,e){return e?te`
      <div class="network-request-details-row">
        <div class="title">${i}</div>
        <div class="value">${e}</div>
      </div>`:B.nothing}function Ea(i){let e="";return i.args.data.syntheticData.isMemoryCached?e+=H(P.FromMemoryCache):i.args.data.syntheticData.isDiskCached?e+=H(P.FromCache):i.args.data.timing?.pushStart&&(e+=H(P.FromPush)),i.args.data.fromServiceWorker&&(e+=H(P.FromServiceWorker)),(i.args.data.encodedDataLength||!e)&&(e=`${mt.ByteUtilities.bytesToString(i.args.data.encodedDataLength)}${e}`),ye(H(P.encodedData),e)}function Ra(i){if(!In.Network.isSyntheticNetworkRequestEventRenderBlocking(i))return B.nothing;let e;switch(i.args.data.renderBlocking){case"blocking":e=P.renderBlocking;break;case"in_body_parser_blocking":e=P.inBodyParserBlocking;break;default:return B.nothing}return ye(H(P.blocking),e)}function Ha(i){let e=i.args.data.syntheticData.isMemoryCached||i.args.data.syntheticData.isDiskCached;return ye(H(P.fromCache),H(e?P.yes:P.no))}function Na(i,e){if(!e)return B.nothing;let t=e.entityForEvent(i);return t?ye(H(P.entity),t.name):B.nothing}function Fa(i){return!i||i.length===0?B.nothing:te`
    <div class="column-divider"></div>
    <div class="network-request-details-col server-timings">
      <div class="server-timing-column-header">${H(P.serverTiming)}</div>
      <div class="server-timing-column-header">${H(P.description)}</div>
      <div class="server-timing-column-header">${H(P.time)}</div>
      ${i.map(e=>{let t=e.metric.startsWith("(c")?"synthetic value":"value";return te`
          <div class=${t}>${e.metric||"-"}</div>
          <div class=${t}>${e.description||"-"}</div>
          <div class=${t}>${e.value||"-"}</div>
        `})}
    </div>`}function Aa(i,e,t,s){if(!s)return B.nothing;let o=We.Helpers.Trace.stackTraceInEvent(i)!==null,n=null,r={tabStop:!0,showColumnNumber:!0,inlineFrameIndex:0};if(o){let l=We.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(i)??null;l&&(n=s.maybeLinkifyConsoleCallFrame(t,l,r))}let a=e?We.Extras.Initiators.getNetworkInitiator(e.data,i):void 0;return a&&We.Types.Events.isSyntheticNetworkRequest(a)&&(n=s.maybeLinkifyScriptLocation(t,null,a.args.data.url,void 0,r)),n?te`
      <div class="network-request-details-item">
        <div class="title">${H(P.initiatedBy)}</div>
        <div class="value focusable-outline">${n}</div>
      </div>`:B.nothing}var Nn={};L(Nn,{DEFAULT_VIEW:()=>Hn,RelatedInsightChips:()=>ws});import*as xs from"./../../../core/i18n/i18n.js";import*as Rn from"./../../../ui/legacy/legacy.js";import*as Ss from"./../../../ui/lit/lit.js";var Dn=`@scope to (devtools-widget > *){:scope{display:block;border-bottom:1px solid var(--sys-color-divider);flex:none}ul{list-style:none;margin:0;display:flex;flex-wrap:wrap;gap:var(--sys-size-4);padding:0 var(--sys-size-4);justify-content:flex-start;align-items:center}.insight-chip button{background:none;user-select:none;font:var(--sys-typescale-body4-regular);border:var(--sys-size-1) solid var(--sys-color-primary);border-radius:var(--sys-shape-corner-extra-small);display:flex;margin:var(--sys-size-4) 0;padding:var(--sys-size-2) var(--sys-size-4) var(--sys-size-2) var(--sys-size-4);width:max-content;white-space:pre;.keyword{color:var(--sys-color-primary);padding-right:var(--sys-size-3)}}.insight-chip button:hover{background-color:var(--sys-color-state-hover-on-subtle);cursor:pointer;transition:opacity 0.2s ease}.insight-message-box{background:var(--sys-color-surface-yellow);border-radius:var(--sys-shape-corner-extra-small);font:var(--sys-typescale-body4-regular);margin:var(--sys-size-4) 0;button{color:var(--sys-color-on-surface-yellow);border:none;text-align:left;background:none;padding:var(--sys-size-4) var(--sys-size-5);width:100%;max-width:500px;.insight-label{color:var(--sys-color-orange-bright);padding-right:var(--sys-size-3);font-weight:var(--ref-typeface-weight-medium);margin-bottom:var(--sys-size-2)}&:hover{background-color:var(--sys-color-state-hover-on-subtle);cursor:pointer;transition:opacity 0.2s ease}}}}
/*# sourceURL=${import.meta.resolve("./relatedInsightChips.css")} */`;var{html:ys,render:Un}=Ss,bs={insightKeyword:"Insight",insightWithName:"Insight: {PH1}"},za=xs.i18n.registerUIStrings("panels/timeline/components/RelatedInsightChips.ts",bs),En=xs.i18n.getLocalizedString.bind(void 0,za),ws=class extends Rn.Widget.Widget{#i;#e=null;#t=new Map;constructor(e,t=Hn){super(e),this.#i=t}set activeEvent(e){e!==this.#e&&(this.#e=e,this.requestUpdate())}set eventToInsightsMap(e){this.#t=e??new Map,this.requestUpdate()}performUpdate(){let e={activeEvent:this.#e,eventToInsightsMap:this.#t,onInsightClick(t){t.activateInsight()}};this.#i(e,{},this.contentElement)}},Hn=(i,e,t)=>{let{activeEvent:s,eventToInsightsMap:o}=i,n=s?o.get(s)??[]:[];if(!s||o.size===0||n.length===0){Un(Ss.nothing,t);return}let r=n.flatMap(l=>l.messages.map(c=>ys`
          <li class="insight-message-box">
            <button type="button" @click=${u=>{u.preventDefault(),i.onInsightClick(l)}}>
              <div class="insight-label">${En(bs.insightWithName,{PH1:l.insightLabel})}</div>
              <div class="insight-message">${c}</div>
            </button>
          </li>
        `)),a=n.flatMap(l=>[ys`
          <li class="insight-chip">
            <button type="button" @click=${c=>{c.preventDefault(),i.onInsightClick(l)}}>
              <span class="keyword">${En(bs.insightKeyword)}</span>
              <span class="insight-label">${l.insightLabel}</span>
            </button>
          </li>
        `]);Un(ys`<style>${Dn}</style>
        <ul>${r}</ul>
        <ul>${a}</ul>`,t)};var tr={};L(tr,{AnnotationHoverOut:()=>zt,DEFAULT_SIDEBAR_TAB:()=>ol,DEFAULT_SIDEBAR_WIDTH_PX:()=>nl,HoverAnnotation:()=>At,RemoveAnnotation:()=>Nt,RevealAnnotation:()=>Ft,SidebarWidget:()=>$s});import*as er from"./../../../core/common/common.js";import*as je from"./../../../ui/legacy/legacy.js";var ki=class i extends Event{model;insightSetKey;static eventName="insightactivated";constructor(e,t){super(i.eventName,{bubbles:!0,composed:!0}),this.model=e,this.insightSetKey=t}},Ci=class i extends Event{static eventName="insightdeactivated";constructor(){super(i.eventName,{bubbles:!0,composed:!0})}};var Vn={};L(Vn,{DEFAULT_VIEW:()=>Bn,SidebarAnnotationsTab:()=>Rt});import"./../../../ui/components/settings/settings.js";import*as qe from"./../../../core/common/common.js";import*as ut from"./../../../core/i18n/i18n.js";import*as Ht from"./../../../core/platform/platform.js";import*as ue from"./../../../models/trace/trace.js";import*as An from"./../../../services/trace_bounds/trace_bounds.js";import*as zn from"./../../../ui/legacy/legacy.js";import*as On from"./../../../ui/legacy/theme_support/theme_support.js";import*as Ke from"./../../../ui/lit/lit.js";import*as Li from"./../../../ui/visual_logging/visual_logging.js";var Fn=`@scope to (devtools-widget > *){:scope{display:block;height:100%}.annotations{display:flex;flex-direction:column;height:100%;padding:0}.visibility-setting{margin-top:auto}.annotation-container{display:flex;justify-content:space-between;align-items:center;padding:0 var(--sys-size-4);.delete-button{visibility:hidden;border:none;background:none}&:hover,
    &:focus-within{background-color:var(--sys-color-neutral-container);button.delete-button{visibility:visible}}}.annotation{display:flex;flex-direction:column;align-items:flex-start;word-break:normal;overflow-wrap:anywhere;padding:var(--sys-size-8) 0;gap:6px}.annotation-identifier{padding:4px 8px;border-radius:10px;font-weight:bold;&.time-range{background-color:var(--app-color-performance-sidebar-time-range);color:var(--app-color-performance-sidebar-label-text-light)}}.entries-link{display:flex;flex-wrap:wrap;row-gap:2px;align-items:center}.label{font-size:larger}.annotation-tutorial-container{padding:10px}.tutorial-card{display:block;position:relative;margin:10px 0;padding:10px;border-radius:var(--sys-shape-corner-extra-small);overflow:hidden;border:1px solid var(--sys-color-divider);background-color:var(--sys-color-base)}.tutorial-image{display:flex;justify-content:center;& > img{max-width:100%;height:auto}}.tutorial-title,
  .tutorial-description{margin:5px 0}}
/*# sourceURL=${import.meta.resolve("./sidebarAnnotationsTab.css")} */`;var{html:Me,render:Oa}=Ke,Ba=new URL("../../../Images/performance-panel-diagram.svg",import.meta.url).toString(),Va=new URL("../../../Images/performance-panel-entry-label.svg",import.meta.url).toString(),_a=new URL("../../../Images/performance-panel-time-range.svg",import.meta.url).toString(),Wa=new URL("../../../Images/performance-panel-delete-annotation.svg",import.meta.url).toString(),q={annotationGetStarted:"Annotate a trace for yourself and others",entryLabelTutorialTitle:"Label an item",entryLabelTutorialDescription:"Double-click or press Enter on an item and type to create an item label.",entryLinkTutorialTitle:"Connect two items",entryLinkTutorialDescription:"Double-click on an item, click on the adjacent rightward arrow, then select the destination item.",timeRangeTutorialTitle:"Define a time range",timeRangeTutorialDescription:"Shift-drag in the flamechart then type to create a time range annotation.",deleteAnnotationTutorialTitle:"Delete an annotation",deleteAnnotationTutorialDescription:"Hover over the list in the sidebar with Annotations tab selected to access the delete function.",deleteButton:"Delete annotation: {PH1}",entryLabelDescriptionLabel:'A "{PH1}" event annotated with the text "{PH2}"',timeRangeDescriptionLabel:"A time range starting at {PH1} and ending at {PH2}",entryLinkDescriptionLabel:'A link between a "{PH1}" event and a "{PH2}" event'},qa=ut.i18n.registerUIStrings("panels/timeline/components/SidebarAnnotationsTab.ts",q),X=ut.i18n.getLocalizedString.bind(void 0,qa),Rt=class extends zn.Widget.Widget{#i=[];#e=new Map;#t;#s;constructor(e=Bn){super(),this.#s=e,this.#t=qe.Settings.Settings.instance().moduleSetting("annotations-hidden")}deduplicatedAnnotations(){return this.#i}setData(e){this.#i=this.#n(e.annotations),this.#e=e.annotationEntryToColorMap,this.requestUpdate()}#n(e){let t=new Set,s=e.filter(o=>{if(this.#a(o))return!0;if(o.type==="ENTRIES_LINK"||o.type==="ENTRY_LABEL"){let n=o.type==="ENTRIES_LINK"?o.entryFrom:o.entry;if(t.has(n))return!1;t.add(n)}return!0});return s.sort((o,n)=>this.#o(o)-this.#o(n)),s}#o(e){switch(e.type){case"ENTRY_LABEL":return e.entry.ts;case"ENTRIES_LINK":return e.entryFrom.ts;case"TIME_RANGE":return e.bounds.min;default:Ht.assertNever(e,`Invalid annotation type ${e}`)}}#a(e){switch(e.type){case"ENTRY_LABEL":return e.label.length>0;case"ENTRIES_LINK":return!!e.entryTo;case"TIME_RANGE":return e.bounds.range>0}}performUpdate(){let e={annotations:this.#i,annotationsHiddenSetting:this.#t,annotationEntryToColorMap:this.#e,onAnnotationClick:t=>{this.contentElement.dispatchEvent(new Ft(t))},onAnnotationHover:t=>{this.contentElement.dispatchEvent(new At(t))},onAnnotationHoverOut:()=>{this.contentElement.dispatchEvent(new zt)},onAnnotationDelete:t=>{this.contentElement.dispatchEvent(new Nt(t))}};this.#s(e,{},this.contentElement)}};function Ka(i){switch(i.type){case"ENTRY_LABEL":{let e=ue.Name.forEntry(i.entry);return X(q.entryLabelDescriptionLabel,{PH1:e,PH2:i.label})}case"TIME_RANGE":{let e=ut.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(i.bounds.min),t=ut.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(i.bounds.max);return X(q.timeRangeDescriptionLabel,{PH1:e,PH2:t})}case"ENTRIES_LINK":{if(!i.entryTo)return"";let e=ue.Name.forEntry(i.entryFrom),t=ue.Name.forEntry(i.entryTo);return X(q.entryLinkDescriptionLabel,{PH1:e,PH2:t})}default:Ht.assertNever(i,"Unsupported annotation")}}function Ts(i){let e=qe.Color.parse(i)?.asLegacyColor(),t="--app-color-performance-sidebar-label-text-dark",s=qe.Color.parse(On.ThemeSupport.instance().getComputedValue(t))?.asLegacyColor();return!e||!s?`var(${t})`:qe.ColorUtils.contrastRatio(e.rgba(),s.rgba())>=4.5?`var(${t})`:"var(--app-color-performance-sidebar-label-text-light)"}function ja(i,e){switch(i.type){case"ENTRY_LABEL":{let t=ue.Name.forEntry(i.entry),s=e.get(i.entry)??"",o=Ts(s),n={backgroundColor:s,color:o};return Me`
            <span class="annotation-identifier" style=${Ke.Directives.styleMap(n)}>
              ${t}
            </span>
      `}case"TIME_RANGE":{let t=An.TraceBounds.BoundsManager.instance().state()?.milli.entireTraceBounds.min??0,s=Math.round(ue.Helpers.Timing.microToMilli(i.bounds.min)-t),o=Math.round(ue.Helpers.Timing.microToMilli(i.bounds.max)-t);return Me`
            <span class="annotation-identifier time-range">
              ${s} - ${o} ms
            </span>
      `}case"ENTRIES_LINK":{let t=ue.Name.forEntry(i.entryFrom),s=e.get(i.entryFrom)??"",o=Ts(s),n={backgroundColor:s,color:o};return Me`
        <div class="entries-link">
          <span class="annotation-identifier" style=${Ke.Directives.styleMap(n)}>
            ${t}
          </span>
          <devtools-icon name="arrow-forward" class="inline-icon large">
          </devtools-icon>
          ${Xa(i,e)}
        </div>
    `}default:Ht.assertNever(i,"Unsupported annotation type")}}function Xa(i,e){if(i.entryTo){let t=ue.Name.forEntry(i.entryTo),s=e.get(i.entryTo)??"",o=Ts(s),n={backgroundColor:s,color:o};return Me`
      <span class="annotation-identifier" style=${Ke.Directives.styleMap(n)}>
        ${t}
      </span>`}return Ke.nothing}function Ga(i){switch(i.type){case"ENTRY_LABEL":return"entry-label";case"TIME_RANGE":return"time-range";case"ENTRIES_LINK":return"entries-link";default:Ht.assertNever(i,"unknown annotation type")}}function Ya(){return Me`<div class="annotation-tutorial-container">
    ${X(q.annotationGetStarted)}
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${Va}></div>
        <div class="tutorial-title">${X(q.entryLabelTutorialTitle)}</div>
        <div class="tutorial-description">${X(q.entryLabelTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${Ba}></div>
        <div class="tutorial-title">${X(q.entryLinkTutorialTitle)}</div>
        <div class="tutorial-description">${X(q.entryLinkTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${_a}></div>
        <div class="tutorial-title">${X(q.timeRangeTutorialTitle)}</div>
        <div class="tutorial-description">${X(q.timeRangeTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${Wa}></div>
        <div class="tutorial-title">${X(q.deleteAnnotationTutorialTitle)}</div>
        <div class="tutorial-description">${X(q.deleteAnnotationTutorialDescription)}</div>
      </div>
    </div>`}var Bn=(i,e,t)=>{Oa(Me`
      <style>${Fn}</style>
      <span class="annotations">
        ${i.annotations.length===0?Ya():Me`
            ${i.annotations.map(s=>{let o=Ka(s);return Me`
                <div class="annotation-container"
                  @click=${()=>i.onAnnotationClick(s)}
                  @mouseover=${()=>s.type==="ENTRY_LABEL"?i.onAnnotationHover(s):null}
                  @mouseout=${()=>s.type==="ENTRY_LABEL"?i.onAnnotationHoverOut():null}
                  aria-label=${o}
                  tabindex="0"
                  jslog=${Li.item(`timeline.annotation-sidebar.annotation-${Ga(s)}`).track({click:!0,resize:!0})}
                >
                  <div class="annotation">
                    ${ja(s,i.annotationEntryToColorMap)}
                    <span class="label">
                      ${s.type==="ENTRY_LABEL"||s.type==="TIME_RANGE"?s.label:""}
                    </span>
                  </div>
                  <button class="delete-button" aria-label=${X(q.deleteButton,{PH1:o})} @click=${n=>{n.stopPropagation(),i.onAnnotationDelete(s)}} jslog=${Li.action("timeline.annotation-sidebar.delete").track({click:!0})}>
                    <devtools-icon class="bin-icon extra-large" name="bin"></devtools-icon>
                  </button>
                </div>`})}
            <setting-checkbox class="visibility-setting" .data=${{setting:i.annotationsHiddenSetting,textOverride:"Hide annotations"}}>
            </setting-checkbox>`}
    </span>`,t)};var Qn={};L(Qn,{DEFAULT_VIEW:()=>Zn,SidebarInsightsTab:()=>Wt});import*as Yn from"./../../../models/trace/trace.js";import"./../../../ui/components/buttons/buttons.js";import*as Ls from"./../../../ui/legacy/legacy.js";import*as gt from"./../../../ui/lit/lit.js";import*as Jn from"./../utils/utils.js";import*as Vt from"./insights/insights.js";var _n=`@scope to (devtools-widget > *){:host{display:flex;flex-flow:column nowrap;flex-grow:1}.insight-sets-wrapper{display:flex;flex-flow:column nowrap;flex-grow:1;details{flex-grow:0}details[open]{flex-grow:1;border-bottom:1px solid var(--sys-color-divider)}summary{background-color:var(--sys-color-surface2);border-bottom:1px solid var(--sys-color-divider);overflow:hidden;padding:2px 5px;text-overflow:ellipsis;white-space:nowrap;font:var(--sys-typescale-body4-medium);display:flex;align-items:center;&:focus{background-color:var(--sys-color-tonal-container)}&::marker{color:var(--sys-color-on-surface-subtle);font-size:11px;line-height:1}details:first-child &{border-top:1px solid var(--sys-color-divider)}}}.zoom-button{margin-left:auto}.zoom-icon{visibility:hidden;&.active devtools-button{visibility:visible}}.dropdown-icon{flex:none;&.active devtools-button{transform:rotate(90deg)}}}
/*# sourceURL=${import.meta.resolve("./sidebarInsightsTab.css")} */`;var Gn={};L(Gn,{SidebarSingleInsightSet:()=>Bt});import*as ks from"./../../../core/i18n/i18n.js";import*as qn from"./../../../models/ai_assistance/ai_assistance.js";import*as Kn from"./../../../models/trace/trace.js";import*as Cs from"./../../../ui/legacy/legacy.js";import*as De from"./../../../ui/lit/lit.js";import*as p from"./insights/insights.js";var Wn=`:host{display:block;padding:5px 8px}.passed-insights-section{margin-top:var(--sys-size-5);summary{font-weight:var(--ref-typeface-weight-medium)}}
/*# sourceURL=${import.meta.resolve("./sidebarSingleInsightSet.css")} */`;var{html:Ot}=De.StaticHtml,Ja={Cache:p.Cache.Cache,CharacterSet:p.CharacterSet.CharacterSet,CLSCulprits:p.CLSCulprits.CLSCulprits,DocumentLatency:p.DocumentLatency.DocumentLatency,DOMSize:p.DOMSize.DOMSize,DuplicatedJavaScript:p.DuplicatedJavaScript.DuplicatedJavaScript,FontDisplay:p.FontDisplay.FontDisplay,ForcedReflow:p.ForcedReflow.ForcedReflow,ImageDelivery:p.ImageDelivery.ImageDelivery,INPBreakdown:p.INPBreakdown.INPBreakdown,LCPDiscovery:p.LCPDiscovery.LCPDiscovery,LCPBreakdown:p.LCPBreakdown.LCPBreakdown,LegacyJavaScript:p.LegacyJavaScript.LegacyJavaScript,ModernHTTP:p.ModernHTTP.ModernHTTP,NetworkDependencyTree:p.NetworkDependencyTree.NetworkDependencyTree,RenderBlocking:p.RenderBlocking.RenderBlocking,SlowCSSSelector:p.SlowCSSSelector.SlowCSSSelector,ThirdParties:p.ThirdParties.ThirdParties,Viewport:p.Viewport.Viewport},jn={passedInsights:"Passed insights ({PH1})"},Za=ks.i18n.registerUIStrings("panels/timeline/components/SidebarSingleInsightSet.ts",jn),Qa=ks.i18n.getLocalizedString.bind(void 0,Za),{widget:Xn}=Cs.Widget,el=(i,e,t)=>{let{shownInsights:s,passedInsights:o,insightSetKey:n,parsedTrace:r,renderInsightComponent:a}=i;function l(){return!n||!r?De.nothing:Ot`${Xn(bt,{data:{insightSetKey:n,parsedTrace:r}})}`}function c(){let u=s.map(a),g=o.map(a);return Ot`
      ${u}
      ${g.length?Ot`
        <details class="passed-insights-section">
          <summary>${Qa(jn.passedInsights,{PH1:g.length})}</summary>
          ${g}
        </details>
      `:De.nothing}
    `}De.render(Ot`
    <style>${Wn}</style>
    <div class="navigation">
      ${l()}
      ${c()}
    </div>
  `,t)},Bt=class i extends Cs.Widget.Widget{#i;#e=!1;#t=-1;#s={insightSetKey:null,activeCategory:Kn.Insights.Types.InsightCategory.ALL,activeInsight:null,parsedTrace:null};constructor(e,t=el){super(e,{useShadowDom:!0}),this.#i=t}set data(e){this.#s=e,this.requestUpdate()}willHide(){super.willHide(),window.clearTimeout(this.#t)}async highlightActiveInsight(){window.clearTimeout(this.#t),this.#e=!1,this.requestUpdate(),await this.updateComplete,this.#e=!0,this.requestUpdate(),this.#t=window.setTimeout(()=>{this.#e=!1,this.requestUpdate()},2e3)}static categorizeInsights(e,t,s){if(!e||!(e instanceof Map))return{shownInsights:[],passedInsights:[]};let o=e.get(t);if(!o)return{shownInsights:[],passedInsights:[]};let n=[],r=[];for(let[a,l]of Object.entries(o.model))!l||!Js({activeCategory:s,insightCategory:l.category})||(l.state==="pass"?r.push({insightName:a,model:l}):n.push({insightName:a,model:l}));return{shownInsights:n,passedInsights:r}}#n(e,t,s){if(!this.#s.parsedTrace)return De.nothing;let{insightName:o,model:n}=t,r=this.#s.activeInsight,a=qn.AIContext.AgentFocus.fromInsight(this.#s.parsedTrace,n),l=r?.model===n,c=Ja[o],u={selected:l,model:n,bounds:e.bounds,insightSetKey:e.id,agentFocus:a,fieldMetrics:s};return Ot`<devtools-widget class="insight-component-widget" ?highlight-insight=${l&&this.#e}
      ${Xn(c,u)}
    ></devtools-widget>`}performUpdate(){let{parsedTrace:e,insightSetKey:t}=this.#s;if(!e?.insights||!t||!(e.insights instanceof Map))return;let s=e.insights.get(t);if(!s)return;let o=ti(e,t),{shownInsights:n,passedInsights:r}=i.categorizeInsights(e.insights,t,this.#s.activeCategory),a={shownInsights:n,passedInsights:r,insightSetKey:t,parsedTrace:e,renderInsightComponent:l=>this.#n(s,l,o)};this.#i(a,void 0,this.contentElement)}};var{html:_t}=gt,{widget:tl}=Ls.Widget,Zn=(i,e,t)=>{let{parsedTrace:s,labels:o,activeInsightSet:n,activeInsight:r,selectedCategory:a,onInsightSetToggled:l,onInsightSetHovered:c,onInsightSetUnhovered:u,onZoomClick:g}=i,h=s.insights;if(!h)return;let w=h.size>1;gt.render(_t`
    <style>${_n}</style>
    <div class="insight-sets-wrapper">
      ${[...h.values()].map((T,f)=>{let{id:K,url:U}=T,M={insightSetKey:K,activeCategory:a,activeInsight:r,parsedTrace:s},y=T===n,G=_t`
          <devtools-widget
            data-insight-set-key=${K}
            ${tl(Bt,{data:M})}
          ></devtools-widget>
        `;return w?_t`<details ?open=${y}>
            <summary
              @click=${()=>l(T)}
              @mouseenter=${()=>c(T)}
              @mouseleave=${()=>u()}
              title=${U.href}>
              ${sl(y)}
              <span>${o[f]}</span>
              <span class='zoom-button'
                @click=${Ii=>{Ii.stopPropagation(),g(T)}}
              >
                ${il(y)}
              </span>
            </summary>
            ${G}
          </details>`:G})}
    </div>
  `,t)};function il(i){let e=gt.Directives.classMap({"zoom-icon":!0,active:i});return _t`
  <div class=${e}>
      <devtools-button .data=${{variant:"icon",iconName:"center-focus-weak",size:"SMALL"}}
    ></devtools-button></div>`}function sl(i){let e=gt.Directives.classMap({"dropdown-icon":!0,active:i});return _t`
    <div class=${e}>
      <devtools-button .data=${{variant:"icon",iconName:"chevron-right",size:"SMALL"}}
    ></devtools-button></div>
  `}var Wt=class i extends Ls.Widget.Widget{static createWidgetElement(){let e=document.createElement("devtools-widget");return new i(e),e}#i;#e=null;#t=null;#s=Yn.Insights.Types.InsightCategory.ALL;#n=null;constructor(e,t=Zn){super(e,{useShadowDom:!0}),this.#i=t}set parsedTrace(e){e!==this.#e&&(this.#e=e,this.#n=null,this.#e?.insights&&(this.#n=[...this.#e.insights.values()].at(0)??null),this.requestUpdate())}get activeInsight(){return this.#t}set activeInsight(e){e!==this.#t&&(this.#t=e,this.#t&&(this.#n=this.#e?.insights?.get(this.#t.insightSetKey)??null),this.requestUpdate())}setActiveInsightSet(e){if(this.#e?.insights){let t=this.#e.insights.get(e);t&&(this.#n=t,this.requestUpdate())}}#o(e){this.#n=this.#n===e?null:e,this.#n?.id!==this.#t?.insightSetKey&&this.element.dispatchEvent(new Vt.SidebarInsight.InsightDeactivated),this.requestUpdate()}#a(e){this.element.dispatchEvent(new Vt.SidebarInsight.InsightSetHovered(e.bounds))}#l(){this.element.dispatchEvent(new Vt.SidebarInsight.InsightSetHovered)}#d(e){this.element.dispatchEvent(new Vt.SidebarInsight.InsightSetZoom(e.bounds))}highlightActiveInsight(){if(!this.#t)return;this.element.shadowRoot?.querySelector(`[data-insight-set-key="${this.#t.insightSetKey}"]`)?.getWidget()?.highlightActiveInsight()}performUpdate(){if(!this.#e?.insights)return;let e=[...this.#e.insights.values()],t={parsedTrace:this.#e,labels:Jn.Helpers.createUrlLabels(e.map(({url:s})=>s)),activeInsightSet:this.#n,activeInsight:this.#t,selectedCategory:this.#s,onInsightSetToggled:this.#o.bind(this),onInsightSetHovered:this.#a.bind(this),onInsightSetUnhovered:this.#l.bind(this),onZoomClick:this.#d.bind(this)};this.#i(t,void 0,this.contentElement)}};var Nt=class i extends Event{removedAnnotation;static eventName="removeannotation";constructor(e){super(i.eventName,{bubbles:!0,composed:!0}),this.removedAnnotation=e}},Ft=class i extends Event{annotation;static eventName="revealannotation";constructor(e){super(i.eventName,{bubbles:!0,composed:!0}),this.annotation=e}},At=class i extends Event{annotation;static eventName="hoverannotation";constructor(e){super(i.eventName,{bubbles:!0,composed:!0}),this.annotation=e}},zt=class i extends Event{static eventName="annotationhoverout";constructor(){super(i.eventName,{bubbles:!0,composed:!0})}},ol="insights",nl=240,rl=170,$s=class extends je.Widget.VBox{#i=new je.TabbedPane.TabbedPane;#e=new Is;#t=new Ps;#s=null;#n=er.Settings.Settings.instance().createSetting("timeline-sidebar-opened-at-least-once",!1);constructor(){super(),this.setMinimumSize(rl,0),this.#i.appendTab("insights","Insights",this.#e,void 0,void 0,!1,!1,0,"timeline.insights-tab"),this.#i.appendTab("annotations","Annotations",this.#t,void 0,void 0,!1,!1,1,"timeline.annotations-tab"),this.#i.selectTab("insights")}wasShown(){super.wasShown(),this.#n.set(!0),this.#i.show(this.element),this.#o(),this.#s&&(this.element.dispatchEvent(new ki(this.#s.model,this.#s.insightSetKey)),this.#s=null),this.#i.selectedTabId==="insights"&&this.#i.tabIsDisabled("insights")&&this.#i.selectTab("annotations")}willHide(){super.willHide();let e=this.#e.getActiveInsight();this.#s=e,e&&this.element.dispatchEvent(new Ci)}setAnnotations(e,t){this.#t.setAnnotations(e,t),this.#o()}#o(){let e=this.#t.deduplicatedAnnotations();this.#i.setBadge("annotations",e.length>0?e.length.toString():null)}setParsedTrace(e){this.#e.setParsedTrace(e),this.#i.setTabEnabled("insights",!!(e?.insights&&e.insights.size>0))}setActiveInsight(e,t){this.#e.setActiveInsight(e,t),e&&this.#i.selectTab("insights")}openInsightsTab(){this.#i.selectTab("insights")}setActiveInsightSet(e){this.#e.setActiveInsightSet(e)}sidebarHasBeenOpened(){return this.#n.get()}},Is=class extends je.Widget.VBox{#i=Wt.createWidgetElement();constructor(){super(),this.element.classList.add("sidebar-insights"),this.#e().show(this.element)}#e(){return je.Widget.Widget.get(this.#i)}setParsedTrace(e){let t=this.#e();t.parsedTrace=e}getActiveInsight(){return this.#e().activeInsight}setActiveInsight(e,t){let s=this.#e();s.activeInsight=e,t.highlight&&e&&s.updateComplete.then(()=>{s.highlightActiveInsight()})}setActiveInsightSet(e){this.#e().setActiveInsightSet(e)}},Ps=class extends je.Widget.VBox{#i=new Rt;constructor(){super(),this.element.classList.add("sidebar-annotations"),this.#i.show(this.element)}setAnnotations(e,t){this.#i.setData({annotations:e,annotationEntryToColorMap:t})}deduplicatedAnnotations(){return this.#i.deduplicatedAnnotations()}};var ur={};L(ur,{TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW:()=>dr,TimelineRangeSummaryView:()=>Rs,statsForTimeRange:()=>mr});import*as Es from"./../../../core/platform/platform.js";import*as ie from"./../../../models/trace/trace.js";import*as Hs from"./../../../ui/legacy/legacy.js";import*as Ns from"./../../../ui/lit/lit.js";var ir=`:host{display:block;height:100%;container-type:inline-size}.timeline-details-range-summary{display:flex;padding:var(--sys-size-4) 0 0;height:100%}.timeline-tree-view{border-left:var(--sys-size-1) solid var(--sys-color-divider)}@container (max-width: 450px){.timeline-details-range-summary{display:grid;grid-template-rows:1fr minmax(50px,1fr);gap:var(--sys-size-4)}.timeline-summary{width:100%}.timeline-tree-view{border-left:none}}.timeline-summary{flex-grow:0}
/*# sourceURL=${import.meta.resolve("./timelineRangeSummaryView.css")} */`;var Ds={};L(Ds,{CATEGORY_SUMMARY_DEFAULT_VIEW:()=>ar,CategorySummary:()=>qt});import*as Ue from"./../../../core/i18n/i18n.js";import*as rr from"./../../../ui/components/buttons/buttons.js";import*as $i from"./../../../ui/legacy/legacy.js";import*as al from"./../../../ui/lit/lit.js";var sr=`@scope to (devtools-widget > *){.timeline-summary{max-height:100%;overflow:hidden auto;scrollbar-width:thin;font-size:var(--sys-typescale-body4-size);flex-direction:column;padding:0 var(--sys-size-6) var(--sys-size-4) var(--sys-size-8);min-width:192px}.summary-range{font-weight:var(--ref-typeface-weight-medium);height:24.5px;line-height:22px}.category-summary{gap:var(--sys-size-4);display:flex;flex-direction:column}.category-row{min-height:16px;line-height:16px}.category-swatch{display:inline-block;width:var(--sys-size-6);height:var(--sys-size-6);margin-right:var(--sys-size-4);top:var(--sys-size-1);position:relative;border:var(--sys-size-1) solid var(--sys-color-neutral-outline)}.category-name{display:inline;word-break:break-all}.category-value{text-align:right;position:relative;float:right;z-index:0;width:var(--sys-size-19)}.background-bar-container{position:absolute;inset:0 0 0 var(--sys-size-3);z-index:-1}.background-bar{width:100%;float:right;height:var(--sys-size-8);background-color:var(--sys-color-surface-yellow);border-bottom:var(--sys-size-1) solid var(--sys-color-yellow-outline)}}
/*# sourceURL=${import.meta.resolve("./timelineSummary.css")} */`;var{render:ll,html:or}=al,Ms={total:"Total",rangeSS:"Range:  {PH1} \u2013 {PH2}"},cl=Ue.i18n.registerUIStrings("panels/timeline/components/TimelineSummary.ts",Ms),nr=Ue.i18n.getLocalizedString.bind(void 0,cl),ar=(i,e,t)=>{ll(or`
        <style>${sr}</style>
        <style>@scope to (devtools-widget > *) { ${$i.inspectorCommonStyles} }</style>
        <style>@scope to (devtools-widget > *) { ${rr.textButtonStyles} }</style>
        <div class="timeline-summary">
            <div class="summary-range">${nr(Ms.rangeSS,{PH1:Ue.TimeUtilities.millisToString(i.rangeStart),PH2:Ue.TimeUtilities.millisToString(i.rangeEnd)})}</div>
            <div class="category-summary">
                ${i.categories.map(s=>or`
                        <div class="category-row">
                        <div class="category-swatch" style="background-color: ${s.color};"></div>
                        <div class="category-name">${s.title}</div>
                        <div class="category-value">
                            ${Ue.TimeUtilities.preciseMillisToString(s.value)}
                            <div class="background-bar-container">
                                <div class="background-bar" style='width: ${(s.value*100/i.total).toFixed(1)}%;'></div>
                            </div>
                        </div>
                        </div>`)}
                <div class="category-row">
                    <div class="category-swatch"></div>
                    <div class="category-name">${nr(Ms.total)}</div>
                    <div class="category-value">
                        ${Ue.TimeUtilities.preciseMillisToString(i.total)}
                        <div class="background-bar-container">
                            <div class="background-bar"></div>
                        </div>
                    </div>
                </div>
              </div>
        </div>
        </div>

      </div>`,t)},qt=class extends $i.Widget.Widget{#i;#e=0;#t=0;#s=0;#n=[];constructor(e,t){super(e),this.#i=t??ar,this.requestUpdate()}set data(e){this.#e=e.rangeStart,this.#t=e.rangeEnd,this.#s=e.total,this.#n=e.categories,this.requestUpdate()}performUpdate(){let e={rangeStart:this.#e,rangeEnd:this.#t,total:this.#s,categories:this.#n};this.#i(e,void 0,this.contentElement)}};var{render:lr,html:cr}=Ns,{widget:dl}=Hs.Widget,Us=Symbol("categoryBreakdownCache"),dr=(i,e,t)=>{let{parsedTrace:s,events:o,startTime:n,endTime:r}=i;if(!o||!s){lr(cr`<div class="timeline-details-range-summary"></div>`,t);return}let a=ie.Helpers.Timing.microToMilli(s.data.Meta.traceBounds.min),l=mr(o,n,r),c=n-a,u=r-a,g=0;for(let w in l)g+=l[w];let h=[];for(let w in ie.Styles.getCategoryStyles()){let T=ie.Styles.getCategoryStyles()[w];if(T.name===ie.Styles.EventCategory.IDLE)continue;let f=l[T.name];f&&h.push({value:f,color:T.getCSSValue(),title:T.title})}h.sort((w,T)=>T.value-w.value),lr(cr`
    <style>${ir}</style>
    <div class="timeline-details-range-summary">
      <devtools-widget class="timeline-summary"
        ${dl(qt,{data:{rangeStart:c,rangeEnd:u,categories:h,total:g}})}
      ></devtools-widget>
      ${i.thirdPartyTreeTemplate??Ns.nothing}
    </div>
  `,t)},Rs=class extends Hs.Widget.Widget{#i;#e;constructor(e,t=dr){super(e,{useShadowDom:!0}),this.#i=t,this.requestUpdate()}set data(e){this.#e=e,this.requestUpdate()}performUpdate(){this.#e&&this.#i(this.#e,void 0,this.contentElement)}};function mr(i,e,t){if(!i.length)return{idle:t-e};a(i);let s=r(n(t),n(e)),o=Object.values(s).reduce((l,c)=>l+c,0);return s.idle=Math.max(0,t-e-o),s;function n(l){let c={},u=i[Us];for(let g in u){let h=u[g],w=Es.ArrayUtilities.upperBound(h.time,l,Es.ArrayUtilities.DEFAULT_COMPARATOR),T;if(w===0)T=0;else if(w===h.time.length)T=h.value[h.value.length-1];else{let f=h.time[w-1],K=h.time[w],U=h.value[w-1],M=h.value[w];T=U+(M-U)*(l-f)/(K-f)}c[g]=T}return c}function r(l,c){let u=Object.assign({},l);for(let g in c)u[g]-=c[g];return u}function a(l){if(l[Us])return;let c={},u=[],g=0;ie.Helpers.Trace.forEachEvent(l,{onStartEvent:T,onEndEvent:f});function h(U,M){let y=c[U];if(y||(y={time:[],value:[]},c[U]=y),y.time.length&&y.time[y.time.length-1]===M||g>M)return;let G=y.value.length>0?y.value[y.value.length-1]:0;y.value.push(G+M-g),y.time.push(M)}function w(U,M,y){U&&h(U,y),g=y,M&&h(M,y)}function T(U){let{startTime:M}=ie.Helpers.Timing.eventTimingsMilliSeconds(U),y=ie.Styles.getEventStyle(U.name)?.category.name||ie.Styles.getCategoryStyles().other.name,G=u.length?u[u.length-1]:null;y!==G&&w(G||null,y,M),u.push(y)}function f(U){let{endTime:M}=ie.Helpers.Timing.eventTimingsMilliSeconds(U),y=u.pop(),G=u.length?u[u.length-1]:null;y!==G&&w(y||null,G||null,M||0)}let K=l;K[Us]=c}}export{Fs as Breadcrumbs,_s as BreadcrumbsUI,js as CPUThrottlingSelector,lo as CWVMetrics,mo as DetailsView,po as ExportTraceOptions,Lo as FieldSettingsDialog,Uo as IgnoreListSetting,No as InteractionBreakdown,Jo as LayoutShiftDetails,wn as LiveMetricsView,cn as MetricCard,Mn as NetworkRequestDetails,Ln as NetworkRequestTooltip,tn as NetworkThrottlingSelector,So as OriginMap,Nn as RelatedInsightChips,tr as Sidebar,Vn as SidebarAnnotationsTab,Qn as SidebarInsightsTab,Gn as SidebarSingleInsightSet,ur as TimelineRangeSummaryView,Ds as TimelineSummary,io as Utils};
//# sourceMappingURL=components.js.map
