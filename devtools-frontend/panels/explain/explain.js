import"./../../ui/components/spinners/spinners.js";import"./../../ui/kit/kit.js";import*as $ from"./../../core/common/common.js";import*as n from"./../../core/host/host.js";import*as H from"./../../core/i18n/i18n.js";import*as y from"./../../core/root/root.js";import*as z from"./../../third_party/marked/marked.js";import"./../../ui/components/buttons/buttons.js";import*as O from"./../../ui/components/input/input.js";import*as P from"./../../ui/components/markdown_view/markdown_view.js";import*as k from"./../../ui/legacy/legacy.js";import*as h from"./../../ui/lit/lit.js";import*as p from"./../../ui/visual_logging/visual_logging.js";import*as I from"./../console/console.js";var L=`@scope to (devtools-widget > *){*{padding:0;margin:0;box-sizing:border-box}:scope{font-family:var(--default-font-family);font-size:inherit;display:block}.wrapper{background-color:var(--sys-color-cdt-base-container);border-radius:16px;container-type:inline-size;display:grid;animation:expand var(--sys-motion-duration-medium2) var(--sys-motion-easing-emphasized) forwards}.wrapper.closing{animation:collapse var(--sys-motion-duration-medium2) var(--sys-motion-easing-emphasized) forwards}@keyframes expand{from{grid-template-rows:0fr}to{grid-template-rows:1fr}}@keyframes collapse{from{grid-template-rows:1fr}to{grid-template-rows:0fr;padding-top:0;padding-bottom:0}}.animation-wrapper{overflow:hidden;padding:var(--sys-size-6) var(--sys-size-8)}.wrapper.top{border-radius:16px 16px 4px 4px}.wrapper.bottom{margin-top:5px;border-radius:4px 4px 16px 16px}header{display:flex;flex-direction:row;gap:6px;color:var(--sys-color-on-surface);font-size:13px;font-style:normal;font-weight:500;margin-bottom:var(--sys-size-6);align-items:center}header:focus-visible{outline:none}header > .filler{display:flex;flex-direction:row;gap:var(--sys-size-5);align-items:center;flex:1}.reminder-container{border-radius:var(--sys-size-5);background-color:var(--sys-color-surface4);padding:var(--sys-size-8);font-weight:var(--ref-typeface-weight-medium);h3{font:inherit}}.reminder-items{display:grid;grid-template-columns:var(--sys-size-8) auto;gap:var(--sys-size-5) var(--sys-size-6);margin-top:var(--sys-size-6);line-height:var(--sys-size-8);font-weight:var(--ref-typeface-weight-regular)}main{--override-markdown-view-message-color:var(--sys-color-on-surface);color:var(--sys-color-on-surface);font-size:12px;font-style:normal;font-weight:400;line-height:20px;p{margin-block:1em}ul{list-style-type:none;list-style-position:inside;padding-inline-start:0.2em;li{display:list-item;list-style-type:disc;list-style-position:outside;margin-inline-start:1em}li::marker{font-size:11px;line-height:1}}label{display:inline-flex;flex-direction:row;gap:0.5em;input,
      span{vertical-align:middle}input[type="checkbox"]{margin-top:0.3em}}}.opt-in-teaser{display:flex;gap:var(--sys-size-5)}devtools-markdown-view{margin-bottom:12px}footer{display:flex;flex-direction:row;align-items:center;color:var(--sys-color-on-surface);font-style:normal;font-weight:400;line-height:normal;margin-top:14px;gap:32px}@container (max-width: 600px){footer{gap:8px}}footer > .filler{flex:1}footer .rating{display:flex;flex-direction:row;gap:8px}textarea{height:84px;padding:10px;border-radius:8px;border:1px solid var(--sys-color-neutral-outline);width:100%;font-family:var(--default-font-family);font-size:inherit}.buttons{display:flex;gap:5px}@media (width <= 500px){.buttons{flex-wrap:wrap}}main .buttons{margin-top:12px}.disclaimer{display:flex;gap:2px;color:var(--sys-color-on-surface-subtle);font-size:11px;align-items:flex-start;flex-direction:column}.link{color:var(--sys-color-primary);text-decoration-line:underline;devtools-icon{color:var(--sys-color-primary);width:14px;height:14px}}button.link{border:none;background:none;cursor:pointer;font:inherit}.loader{background:linear-gradient(130deg,transparent 0%,var(--sys-color-gradient-tertiary) 20%,var(--sys-color-gradient-primary) 40%,transparent 60%,var(--sys-color-gradient-tertiary) 80%,var(--sys-color-gradient-primary) 100%);background-position:0% 0%;background-size:250% 250%;animation:gradient 5s infinite linear}@keyframes gradient{0%{background-position:0 0}100%{background-position:100% 100%}}summary{font-size:12px;font-style:normal;font-weight:400;line-height:20px}details{overflow:hidden;margin-top:10px}::details-content{height:0;transition:height var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized),content-visibility var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized) allow-discrete}[open]::details-content{height:auto}details.references{transition:margin-bottom var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized)}details.references[open]{margin-bottom:var(--sys-size-1)}h2{display:block;font-size:var(--sys-size-7);margin:0;font-weight:var(--ref-typeface-weight-medium);line-height:var(--sys-size-9)}h2:focus-visible{outline:none}.info{width:20px;height:20px}.badge{background:linear-gradient(135deg,var(--sys-color-gradient-primary),var(--sys-color-gradient-tertiary));border-radius:var(--sys-size-3);height:var(--sys-size-9);devtools-icon{margin:var(--sys-size-2)}}.header-icon-container{background:linear-gradient(135deg,var(--sys-color-gradient-primary),var(--sys-color-gradient-tertiary));border-radius:var(--sys-size-4);height:36px;width:36px;display:flex;align-items:center;justify-content:center}.close-button{align-self:flex-start}.sources-list{padding-left:var(--sys-size-6);margin-bottom:var(--sys-size-6);list-style:none;counter-reset:sources;display:grid;grid-template-columns:var(--sys-size-9) auto;list-style-position:inside}.sources-list li{display:contents}.sources-list li::before{counter-increment:sources;content:"[" counter(sources) "]";display:table-cell}.sources-list devtools-link.highlighted{animation:highlight-fadeout 2s}@keyframes highlight-fadeout{from{background-color:var(--sys-color-yellow-container)}to{background-color:transparent}}.references-list{padding-left:var(--sys-size-8)}.references-list li{padding-left:var(--sys-size-3)}details h3{font-size:10px;font-weight:var(--ref-typeface-weight-medium);text-transform:uppercase;color:var(--sys-color-on-surface-subtle);padding-left:var(--sys-size-6)}.error-message{font:var(--sys-typescale-body4-bold)}@scope (.insight-sources){:root{padding:0;margin:0;box-sizing:border-box;display:block}ul{color:var(--sys-color-primary);font-size:12px;font-style:normal;font-weight:400;line-height:18px;margin-top:8px;padding-left:var(--sys-size-6)}li{list-style-type:none}ul .link{color:var(--sys-color-primary);display:inline-flex!important;align-items:center;gap:4px;text-decoration-line:underline}devtools-icon{height:16px;width:16px;margin-right:var(--sys-size-1)}devtools-icon[name="open-externally"]{color:var(--icon-link)}.source-disclaimer{color:var(--sys-color-on-surface-subtle)}}}
/*# sourceURL=${import.meta.resolve("././components/consoleInsight.css")} */`;var l={consoleMessage:"Console message",stackTrace:"Stacktrace",networkRequest:"Network request",relatedCode:"Related code",generating:"Generating explanation\u2026",insight:"Explanation",closeInsight:"Close explanation",inputData:"Data used to understand this message",goodResponse:"Good response",badResponse:"Bad response",report:"Report legal issue",error:"DevTools has encountered an error",errorBody:"Something went wrong. Try again.",opensInNewTab:"(opens in a new tab)",learnMore:"Learn more",notLoggedIn:"This feature is only available when you sign into Chrome with your Google account.",signIn:"Sign in",offlineHeader:"DevTools can\u2019t reach the internet",offline:"Check your internet connection and try again.",signInToUse:"Sign in to use this feature",search:"Use search instead",reloadRecommendation:"Reload the page to capture related network request data for this message in order to create a better insight.",turnOnInSettings:"Turn on {PH1} to receive AI assistance for understanding and addressing console warnings and errors.",settingsLink:"`Console insights` in Settings",references:"Sources and related content",relatedContent:"Related content",timedOut:"Generating a response took too long. Please try again.",notAvailableInIncognitoMode:"AI assistance is not available in Incognito mode or Guest mode"},N=H.i18n.registerUIStrings("panels/explain/components/ConsoleInsight.ts",l),d=H.i18n.getLocalizedString.bind(void 0,N),j=h.i18nTemplate.bind(void 0,N),{render:q,html:a,Directives:x}=h,{widget:B}=k.Widget,M=class i extends Event{static eventName="closeinsight";constructor(){super(i.eventName,{composed:!0,bubbles:!0})}};function U(i){switch(i){case I.PromptBuilder.SourceType.MESSAGE:return d(l.consoleMessage);case I.PromptBuilder.SourceType.STACKTRACE:return d(l.stackTrace);case I.PromptBuilder.SourceType.NETWORK_REQUEST:return d(l.networkRequest);case I.PromptBuilder.SourceType.RELATED_CODE:return d(l.relatedCode)}}var W="https://policies.google.com/terms",F="https://policies.google.com/privacy",K="https://support.google.com/legal/answer/13505487",V="https://goo.gle/devtools-console-messages-ai",Q="https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504",Y="https://accounts.google.com",J={name:"citation",level:"inline",start(i){return i.match(/\[\^/)?.index},tokenizer(i){let e=i.match(/^\[\^(\d+)\]/);return e?{type:"citation",raw:e[0],linkText:Number(e[1])}:!1},renderer:()=>""};function D(i){return!!i.factualityMetadata?.facts.length}var C=i=>i.stopPropagation();function X(i){return a`<devtools-button
    @click=${i}
    class="search-button"
    .variant=${"outlined"}
    .jslogContext=${"search"}
  >
    ${d(l.search)}
  </devtools-button>`}function Z(){return a`<devtools-link href=${V} class="link" jslogcontext="learn-more">
    ${d(l.learnMore)}
  </devtools-link>`}function ee(i,e,t,s){return i.length?a`
    <ol class="sources-list">
      ${i.map((r,c)=>a`
        <li>
          <devtools-link
            href=${r}
            class=${x.classMap({link:!0,highlighted:c===e})}
            jslogcontext="references.console-insights"
            ${x.ref(o=>{s.citationLinks[c]=o})}
            @animationend=${t}
          >
            ${r}
          </devtools-link>
        </li>
      `)}
    </ol>
  `:h.nothing}function te(i,e){return i.length===0?h.nothing:a`
    ${e.length?a`<h3>${d(l.relatedContent)}</h3>`:h.nothing}
    <ul class="references-list">
      ${i.map(t=>a`
        <li>
          <devtools-link
            href=${t}
            class="link"
            jslogcontext="references.console-insights"
          >
            ${t}
          </devtools-link>
        </li>
      `)}
    </ul>
  `}function ie(){return a`
    <div role="presentation" aria-label="Loading" class="loader" style="clip-path: url('#clipPath');">
      <svg width="100%" height="64">
        <clipPath id="clipPath">
          <rect x="0" y="0" width="100%" height="16" rx="8"></rect>
          <rect x="0" y="24" width="100%" height="16" rx="8"></rect>
          <rect x="0" y="48" width="100%" height="16" rx="8"></rect>
        </clipPath>
      </svg>
    </div>`}function ne(i,e){return a`
    <div class="insight-sources">
      <ul>
        ${x.repeat(i,t=>t.value,t=>a`<li><devtools-link class="link" title="${U(t.type)} ${d(l.opensInNewTab)}" href="data:text/plain;charset=utf-8,${encodeURIComponent(t.value)}" .jslogContext=${"source-"+t.type}>
            <devtools-icon name="open-externally"></devtools-icon>
            ${U(t.type)}
          </devtools-link></li>`)}
        ${e?a`<li class="source-disclaimer">
          <devtools-icon name="warning"></devtools-icon>
          ${d(l.reloadRecommendation)}</li>`:h.nothing}
      </ul>
    </div>`}function se(i,{renderer:e,disableAnimations:t,areReferenceDetailsOpen:s,highlightedCitationIndex:r,callbacks:c},o){return a`
        ${i.validMarkdown?a`<devtools-markdown-view
            .data=${{tokens:i.tokens,renderer:e,animationEnabled:!t}}>
          </devtools-markdown-view>`:i.explanation}
        ${i.timedOut?a`<p class="error-message">${d(l.timedOut)}</p>`:h.nothing}
        ${D(i.metadata)?a`
          <details
            class="references"
            ?open=${s}
            jslog=${p.expand("references").track({click:!0})}
            @toggle=${c.onToggleReferenceDetails}
            @transitionend=${c.onReferencesOpen}
          >
            <summary>${d(l.references)}</summary>
            ${ee(i.directCitationUrls,r,c.onCitationAnimationEnd,o)}
            ${te(i.relatedUrls,i.directCitationUrls)}
          </details>
        `:h.nothing}
        <details jslog=${p.expand("sources").track({click:!0})}>
          <summary>${d(l.inputData)}</summary>
          ${ne(i.sources,i.isPageReloadRecommended)}
        </details>
        <div class="buttons">
          ${X(c.onSearch)}
        </div>`}function S(i){return a`<div class="error">${i}</div>`}function oe(i){return a`
    <h3>Things to consider</h3>
    <div class="reminder-items">
      <div>
        <devtools-icon name="google" class="medium">
        </devtools-icon>
      </div>
      <div>The console message, associated stack trace, related source code, and the associated network headers are sent to Google to generate explanations. ${i?"The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models.":"This data may be seen by human reviewers to improve this feature. Avoid sharing sensitive or personal information."}
      </div>
      <div>
        <devtools-icon name="policy" class="medium">
        </devtools-icon>
      </div>
      <div>Use of this feature is subject to the <devtools-link
          href=${W}
          class="link"
          jslogcontext="terms-of-service.console-insights">
        Google Terms of Service
        </devtools-link> and <devtools-link
          href=${F}
          class="link"
          jslogcontext="privacy-policy.console-insights">
        Google Privacy Policy
        </devtools-link>
      </div>
      <div>
        <devtools-icon name="warning" class="medium">
        </devtools-icon>
      </div>
      <div>
        <devtools-link
          href=${K}
          class="link"
          jslogcontext="code-snippets-explainer.console-insights"
        >Use generated code snippets with caution</devtools-link>
      </div>
    </div>`}function re(i){let e=a`
    <button
      class="link" role="link"
      jslog=${p.action("open-ai-settings").track({click:!0})}
      @click=${i}
    >${d(l.settingsLink)}</button>`;return a`
    <div class="badge">
      <devtools-icon name="lightbulb-spark" class="medium">
      </devtools-icon>
    </div>
    <div>
      ${j(l.turnOnInSettings,{PH1:e})} ${Z()}
    </div>`}function ae(){return S(y.Runtime.hostConfig.isOffTheRecord?d(l.notAvailableInIncognitoMode):d(l.notLoggedIn))}function _(i,e){return a`<span>
    AI tools may generate inaccurate info that doesn't represent Google's views. ${i?"The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models.":"Data sent to Google may be seen by human reviewers to improve this feature."} <button class="link" role="link" @click=${e}
              jslog=${p.action("open-ai-settings").track({click:!0})}>
      Open settings
    </button> or <devtools-link href=${V}
        class="link" jslogcontext="learn-more">
      learn more
    </devtools-link>
  </span>`}function E(i,e){return a`
    <div class="disclaimer">
      ${_(i,e)}
    </div>`}function le(i){return y.Runtime.hostConfig.isOffTheRecord?h.nothing:a`
    <div class="filler"></div>
    <div>
      <devtools-button
        @click=${i}
        .variant=${"primary"}
        .jslogContext=${"update-settings"}
      >
        ${d(l.signIn)}
      </devtools-button>
    </div>`}function ce(i,e){return a`
    <div class="filler"></div>
    <div class="buttons">
      <devtools-button
        @click=${i}
        .variant=${"tonal"}
        .jslogContext=${"settings"}
        .title=${"Settings"}
      >
        Settings
      </devtools-button>
      <devtools-button
        class='continue-button'
        @click=${e}
        .variant=${"primary"}
        .jslogContext=${"continue"}
        .title=${"continue"}
      >
        Continue
      </devtools-button>
    </div>`}function de(i,e,t){return a`
  <div class="disclaimer">
    ${_(i,t.onDisclaimerSettingsLink)}
  </div>
  <div class="filler"></div>
  <div class="rating">
    <devtools-button
      data-rating="true"
      .iconName=${"thumb-up"}
      .toggledIconName=${"thumb-up"}
      .variant=${"icon_toggle"}
      .size=${"SMALL"}
      .toggleOnClick=${!1}
      .toggleType=${"primary-toggle"}
      .disabled=${e!==void 0}
      .toggled=${e===!0}
      .title=${d(l.goodResponse)}
      .jslogContext=${"thumbs-up"}
      @click=${()=>t.onRating(!0)}
    ></devtools-button>
    <devtools-button
      data-rating="false"
      .iconName=${"thumb-down"}
      .toggledIconName=${"thumb-down"}
      .variant=${"icon_toggle"}
      .size=${"SMALL"}
      .toggleOnClick=${!1}
      .toggleType=${"primary-toggle"}
      .disabled=${e!==void 0}
      .toggled=${e===!1}
      .title=${d(l.badResponse)}
      .jslogContext=${"thumbs-down"}
      @click=${()=>t.onRating(!1)}
    ></devtools-button>
    <devtools-button
      .iconName=${"report"}
      .variant=${"icon"}
      .size=${"SMALL"}
      .title=${d(l.report)}
      .jslogContext=${"report"}
      @click=${t.onReport}
    ></devtools-button>
  </div>`}function ge(){return a`
    <div class="header-icon-container">
      <devtools-icon name="lightbulb-spark" class="large">
      </devtools-icon>
    </div>`}function w({headerText:i,showIcon:e=!1,showSpinner:t=!1,onClose:s},r){return a`
    <header>
      ${e?ge():h.nothing}
      <div class="filler">
        <h2 tabindex="-1" ${x.ref(r)}>
          ${i}
        </h2>
        ${t?a`<devtools-spinner></devtools-spinner>`:h.nothing}
      </div>
      <div class="close-button">
        <devtools-button
          .iconName=${"cross"}
          .variant=${"icon"}
          .size=${"SMALL"}
          .title=${d(l.closeInsight)}
          jslog=${p.close().track({click:!0})}
          @click=${s}
        ></devtools-button>
      </div>
    </header>
  `}var he=(i,e,t)=>{let{state:s,noLogging:r,callbacks:c}=i,{onClose:o,onDisclaimerSettingsLink:m}=c,v=`${p.section(s.type).track({resize:!0})}`,u=h.nothing,g=h.nothing,A={},b;switch(s.type){case"loading":u=w({headerText:d(l.generating),onClose:o},e.headerRef),g=ie();break;case"insight":u=w({headerText:d(l.insight),onClose:o,showSpinner:!s.completed},e.headerRef),g=se(s,i,e),b=de(r,i.selectedRating,c);break;case"error":u=w({headerText:d(l.error),onClose:o},e.headerRef),g=S(d(l.errorBody)),b=E(r,m);break;case"consent-reminder":u=w({headerText:"Understand console messages with AI",onClose:o,showIcon:!0},e.headerRef),A["reminder-container"]=!0,g=oe(r),b=ce(c.onReminderSettingsLink,c.onConsentReminderConfirmed);break;case"setting-is-not-true":A["opt-in-teaser"]=!0,g=re(c.onEnableInsightsInSettingsLink);break;case"not-logged-in":case"sync-is-paused":u=w({headerText:d(l.signInToUse),onClose:o},e.headerRef),g=ae(),b=le(c.onGoToSignIn);break;case"offline":u=w({headerText:d(l.offlineHeader),onClose:o},e.headerRef),g=S(d(l.offline)),b=E(r,m);break}q(a`
    <style>${L}</style>
    <style>${O.checkboxStyles}</style>
    <div
      class=${x.classMap({wrapper:!0,closing:i.closing})}
      jslog=${p.pane("console-insights").track({resize:!0})}
      @animationend=${c.onAnimationEnd}
      @keydown=${C}
      @keyup=${C}
      @keypress=${C}
      @click=${C}
    >
      <div class="animation-wrapper">
        ${u}
        <main jslog=${v} class=${x.classMap(A)}>
          ${g}
        </main>
        ${b?a`<footer jslog=${p.section("footer")}>
          ${b}
        </footer>`:h.nothing}
      </div>
    </div>
  `,t)},R=class i extends k.Widget.Widget{static async create(e,t){let s=await n.AidaClient.AidaClient.checkAccessPreconditions();return a`<devtools-widget class="devtools-console-insight" ${B(r=>new i(e,t,s,r))}>
    </devtools-widget>`}disableAnimations=!1;#f;#o;#c;#d;#e;#v=x.createRef();#y=[];#n=-1;#r=!1;#b=!1;#g=!1;#s;#t;#a;#h;#k;constructor(e,t,s,r,c=he){super(r),this.#f=c,this.#o=e,this.#c=t,this.#a=s,this.#t=this.#$(),this.#d=new P.MarkdownView.MarkdownInsightRenderer(this.#u.bind(this)),this.#k=new z.Marked.Marked({extensions:[J]}),this.#e=this.#p(),this.#h=this.#w.bind(this),this.requestUpdate()}#u(e){if(this.#e.type!=="insight")return;let t=this.#r;this.#r=!0,this.#n=e-1,this.requestUpdate(),t&&this.#x()}#x(){let e=this.#y[this.#n];e&&(e.scrollIntoView({behavior:"auto"}),e.focus())}#p(){switch(this.#a){case"available":{let e=$.Settings.Settings.instance().createSetting("console-insights-skip-reminder",!1,"Session").get();return{type:"loading",consentOnboardingCompleted:this.#m().get()||e}}case"no-account-email":return{type:"not-logged-in"};case"sync-is-paused":return{type:"sync-is-paused"};case"no-internet":return{type:"offline"}}}#$(){try{return $.Settings.moduleSetting("console-insights-enabled")}catch{return}}#m(){return $.Settings.Settings.instance().createLocalSetting("console-insights-onboarding-finished",!1)}wasShown(){super.wasShown(),this.focus(),this.#t?.addChangeListener(this.#I,this);let e=y.Runtime.hostConfig.aidaAvailability?.blockedByAge===!0;this.#e.type==="loading"&&this.#t?.getIfNotDisabled()===!0&&!e&&this.#e.consentOnboardingCompleted&&n.userMetrics.actionTaken(n.UserMetrics.Action.GeneratingInsightWithoutDisclaimer),n.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged",this.#h),this.#w(),this.#e.type!=="insight"&&this.#e.type!=="error"&&(this.#e=this.#p()),this.#l()}willHide(){super.willHide(),this.#t?.removeChangeListener(this.#I,this),n.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged",this.#h)}async#w(){let e=await n.AidaClient.AidaClient.checkAccessPreconditions();e!==this.#a&&(this.#a=e,this.#e=this.#p(),this.#l())}#I(){this.#t?.getIfNotDisabled()===!0&&this.#m().set(!0),this.#e.type==="setting-is-not-true"&&this.#t?.getIfNotDisabled()===!0&&(this.#i({type:"loading",consentOnboardingCompleted:!0}),n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsOptInTeaserConfirmedInSettings),this.#l()),this.#e.type==="consent-reminder"&&this.#t?.getIfNotDisabled()===!1&&(this.#i({type:"loading",consentOnboardingCompleted:!1}),n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsReminderTeaserAbortedInSettings),this.#l())}#i(e){this.#b=this.#e.type!==e.type,this.#e=e,this.requestUpdate()}async#l(){if(this.#e.type!=="loading")return;let e=y.Runtime.hostConfig.aidaAvailability?.blockedByAge===!0;if(this.#t?.getIfNotDisabled()!==!0||e){this.#i({type:"setting-is-not-true"}),n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsOptInTeaserShown);return}if(!this.#e.consentOnboardingCompleted){let{sources:t,isPageReloadRecommended:s}=await this.#o.buildPrompt();this.#i({type:"consent-reminder",sources:t,isPageReloadRecommended:s}),n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsReminderTeaserShown);return}await this.#C()}#R(){this.#e.type==="consent-reminder"&&n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsReminderTeaserCanceled),this.#g=!0,this.requestUpdate()}#T(){if(this.#g){this.contentElement.dispatchEvent(new M);return}this.#b&&this.#v.value?.focus()}#A(){this.#n!==-1&&(this.#n=-1,this.requestUpdate())}#M(e){if(this.#e.type!=="insight")throw new Error("Unexpected state");if(this.#e.metadata?.rpcGlobalId===void 0)throw new Error("RPC Id not in metadata");if(this.#s!==void 0)return;this.#s=e,this.requestUpdate(),this.#s?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightRatedPositive):n.userMetrics.actionTaken(n.UserMetrics.Action.InsightRatedNegative);let t=y.Runtime.hostConfig.aidaAvailability?.disallowLogging??!0;return this.#c.registerClientEvent({corresponding_aida_rpc_global_id:this.#e.metadata.rpcGlobalId,disable_user_content_logging:t,do_conversation_client_event:{user_feedback:{sentiment:this.#s?"POSITIVE":"NEGATIVE"}}})}#S(){n.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Q)}#H(){let e=this.#o.getSearchQuery();n.InspectorFrontendHost.InspectorFrontendHostInstance.openSearchResultsInNewTab(e)}async#L(){this.#m().set(!0),this.#i({type:"loading",consentOnboardingCompleted:!0}),n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsReminderTeaserConfirmed),await this.#C()}#U(e,t){let s=[];if(!D(t)||!t.attributionMetadata)return{explanationWithCitations:e,directCitationUrls:s};let{attributionMetadata:r}=t,c=r.citations.filter(m=>m.sourceType===n.AidaClient.CitationSourceType.WORLD_FACTS).sort((m,v)=>(v.endIndex||0)-(m.endIndex||0)),o=e;for(let[m,v]of c.entries()){let u=/[.,:;!?]*\s/g;u.lastIndex=v.endIndex||0;let g=u.exec(o);g&&v.uri&&(o=o.slice(0,g.index)+`[^${c.length-m}]`+o.slice(g.index),s.push(v.uri))}return s.reverse(),{explanationWithCitations:o,directCitationUrls:s}}#E(e){for(let t of e)if(t.type==="code"){let s=t.text.match(/\[\^\d+\]/g);if(t.text=t.text.replace(/\[\^\d+\]/g,""),s?.length){let r=s.map(c=>{let o=parseInt(c.slice(2,-1),10);return{index:o,clickHandler:this.#u.bind(this,o)}});t.citations=r}}}#z(e,t){if(!t.factualityMetadata?.facts.length)return[];let s=t.factualityMetadata.facts.filter(o=>o.sourceUri&&!e.includes(o.sourceUri)).map(o=>o.sourceUri)||[],r=t.attributionMetadata?.citations.filter(o=>o.sourceType===n.AidaClient.CitationSourceType.TRAINING_DATA&&(o.uri||o.repository)).map(o=>o.uri||`https://www.github.com/${o.repository}`)||[],c=[...new Set(r.filter(o=>!s.includes(o)&&!e.includes(o)))];return s.push(...c),s}async#C(){try{for await(let{sources:e,isPageReloadRecommended:t,explanation:s,metadata:r,completed:c}of this.#P()){let{explanationWithCitations:o,directCitationUrls:m}=this.#U(s,r),v=this.#z(m,r),u=this.#O(o),g=u!==!1;g&&this.#E(u),this.#i({type:"insight",tokens:g?u:[],validMarkdown:g,explanation:s,sources:e,metadata:r,isPageReloadRecommended:t,completed:c,directCitationUrls:m,relatedUrls:v})}n.userMetrics.actionTaken(n.UserMetrics.Action.InsightGenerated)}catch(e){console.error("[ConsoleInsight] Error in #generateInsight:",e),n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErrored),e.message==="doAidaConversation timed out"&&this.#e.type==="insight"?(this.#e.timedOut=!0,this.#i({...this.#e,completed:!0,timedOut:!0})):this.#i({type:"error",error:e.message})}}#O(e){try{let t=this.#k.lexer(e);for(let s of t)this.#d.renderToken(s);return t}catch{return n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredMarkdown),!1}}async*#P(){let{prompt:e,sources:t,isPageReloadRecommended:s}=await this.#o.buildPrompt();try{for await(let r of this.#c.doConversation(n.AidaClient.AidaClient.buildConsoleInsightsRequest(e)))yield{sources:t,isPageReloadRecommended:s,...r}}catch(r){throw r.message==="Server responded: permission denied"?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredPermissionDenied):r.message.startsWith("Cannot send request:")?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredCannotSend):r.message.startsWith("Request failed:")?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredRequestFailed):r.message.startsWith("Cannot parse chunk:")?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredCannotParseChunk):r.message==="Unknown chunk result"?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredUnknownChunk):r.message.startsWith("Server responded:")?n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredApi):n.userMetrics.actionTaken(n.UserMetrics.Action.InsightErroredOther),r}}#N(){n.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Y)}#V(e){let t=e.target;t&&(this.#r=t.open,t.open||(this.#n=-1),this.requestUpdate())}#D(){k.ViewManager.ViewManager.instance().showView("chrome-ai")}#_(){n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsReminderTeaserSettingsLinkClicked),k.ViewManager.ViewManager.instance().showView("chrome-ai")}#G(){n.userMetrics.actionTaken(n.UserMetrics.Action.InsightsOptInTeaserSettingsLinkClicked),k.ViewManager.ViewManager.instance().showView("chrome-ai")}performUpdate(){let e={state:this.#e,closing:this.#g,disableAnimations:this.disableAnimations,renderer:this.#d,citationClickHandler:this.#u.bind(this),selectedRating:this.#s,noLogging:y.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue===y.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING,areReferenceDetailsOpen:this.#r,highlightedCitationIndex:this.#n,callbacks:{onClose:this.#R.bind(this),onAnimationEnd:this.#T.bind(this),onCitationAnimationEnd:this.#A.bind(this),onSearch:this.#H.bind(this),onRating:this.#M.bind(this),onReport:this.#S.bind(this),onGoToSignIn:this.#N.bind(this),onConsentReminderConfirmed:this.#L.bind(this),onToggleReferenceDetails:this.#V.bind(this),onDisclaimerSettingsLink:this.#D.bind(this),onReminderSettingsLink:this.#_.bind(this),onEnableInsightsInSettingsLink:this.#G.bind(this),onReferencesOpen:this.#x.bind(this)}},t={headerRef:this.#v,citationLinks:[]};this.#f(e,t,this.contentElement),this.#y=t.citationLinks}};import*as f from"./../../core/host/host.js";import*as T from"./../console/console.js";var G=class{handleAction(e,t){switch(t){case"explain.console-message.context":case"explain.console-message.context.error":case"explain.console-message.context.warning":case"explain.console-message.context.other":case"explain.console-message.teaser":case"explain.console-message.hover":{let s=e.flavor(T.ConsoleViewMessage.ConsoleViewMessage);if(s){t.startsWith("explain.console-message.context")?f.userMetrics.actionTaken(f.UserMetrics.Action.InsightRequestedViaContextMenu):t==="explain.console-message.teaser"?f.userMetrics.actionTaken(f.UserMetrics.Action.InsightRequestedViaTeaser):t==="explain.console-message.hover"&&f.userMetrics.actionTaken(f.UserMetrics.Action.InsightRequestedViaHoverButton);let r=new T.PromptBuilder.PromptBuilder(s),c=new f.AidaClient.AidaClient;return R.create(r,c).then(o=>{s.setInsight(o)}),!0}return!1}}return!1}};export{G as ActionDelegate,M as CloseEvent,R as ConsoleInsight,he as DEFAULT_VIEW};
//# sourceMappingURL=explain.js.map
