var Pi=Object.defineProperty;var J=(t,e)=>{for(var s in e)Pi(t,s,{get:e[s],enumerable:!0})};import"./../../ui/kit/kit.js";import*as F from"./../../core/common/common.js";import*as w from"./../../core/host/host.js";import*as At from"./../../core/i18n/i18n.js";import*as Li from"./../../core/platform/platform.js";import*as R from"./../../core/root/root.js";import*as u from"./../../core/sdk/sdk.js";import*as g from"./../../models/ai_assistance/ai_assistance.js";import*as Xt from"./../../models/annotations/annotations.js";import*as St from"./../../models/badges/badges.js";import*as pe from"./../../models/greendev/greendev.js";import*as Te from"./../../models/workspace/workspace.js";import"./../../ui/components/buttons/buttons.js";import*as Mi from"./../../ui/components/snackbars/snackbars.js";import*as Ri from"./../../ui/helpers/helpers.js";import*as h from"./../../ui/legacy/legacy.js";import*as O from"./../../ui/lit/lit.js";import*as Ye from"./../../ui/visual_logging/visual_logging.js";import*as Ke from"./../lighthouse/lighthouse.js";import*as Ei from"./../network/forward/forward.js";import*as me from"./../network/network.js";import*as Ie from"./../timeline/timeline.js";var es=`.toolbar-container{display:flex;flex-wrap:wrap;background-color:var(--sys-color-cdt-base-container);border-bottom:1px solid var(--sys-color-divider);flex:0 0 auto;justify-content:space-between}.ai-assistance-view-container{display:flex;flex-direction:column;width:100%;height:100%;align-items:center;overflow:hidden;& .fill-panel{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}devtools-split-view{width:100%;height:100%}}.toolbar-feedback-link{color:var(--sys-color-primary);margin:0 var(--sys-size-3);height:auto;font-size:var(--sys-typescale-body4-size)}
/*# sourceURL=${import.meta.resolve("././aiAssistancePanel.css")} */`;import*as ue from"./../../core/sdk/sdk.js";import*as Je from"./../../ui/lit/lit.js";import*as $t from"./../common/common.js";import*as ts from"./../../core/common/common.js";import*as ss from"./../../core/platform/platform.js";import*as It from"./../../models/ai_assistance/ai_assistance.js";import*as is from"./../../models/logs/logs.js";import*as os from"./../../ui/components/markdown_view/markdown_view.js";import*as Di from"./../../ui/lit/lit.js";var{html:Tt}=Di,V=class extends os.MarkdownView.MarkdownInsightRenderer{#o(e,s){return Tt`<devtools-link @click=${i=>{i.preventDefault(),i.stopPropagation(),ts.Revealer.reveal(e)}}>${ss.StringUtilities.trimEndWithMaxLength(s,100)}</devtools-link>`}#t(e,s){if(e.startsWith("#req-")){let i=is.NetworkLog.NetworkLog.instance().requests().find(o=>o.requestId()===e.substring(5));return i?this.#o(i,i.url()):Tt`${s}`}if(e.startsWith("#file-")){let i=It.ContextSelectionAgent.ContextSelectionAgent.getUISourceCodes().find(o=>It.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.get(o)===Number(e.substring(6)));return i?this.#o(i,i.name()):Tt`${s}`}return null}templateForToken(e){if(e.type==="link"){let s=this.#t(e.href,e.text);if(s)return s}if(e.type==="code"){let s=e.text.split(`
`);s[0]?.trim()==="css"&&(e.lang="css",e.text=s.slice(1).join(`
`))}if(e.type==="codespan"){let s=e.text.match(/^\[(.*)\]\((.+)\)$/);if(s?.[2]){let i=this.#t(s[2],s[1]);if(i)return i}}return super.templateForToken(e)}};var{html:ns}=Je.StaticHtml,{until:as}=Je.Directives,Qe=class extends V{mainFrameId;constructor(e=""){super(),this.mainFrameId=e}templateForToken(e){if(e.type==="link"&&e.href.startsWith("#")){if(e.href.startsWith("#path-")){let i=e.href.replace("#path-","");return ns`<span>${as(this.#t(i,e.text).then(o=>o||e.text),e.text)}</span>`}let s;if(e.href.startsWith("#node-")?s=Number(e.href.replace("#node-","")):e.href.startsWith("#")&&(s=Number(e.href.replace("#",""))),s)return ns`<span>${as(this.#o(s,e.text).then(i=>i||e.text),e.text)}</span>`}return super.templateForToken(e)}async#o(e,s){if(e===void 0)return;let o=ue.TargetManager.TargetManager.instance().primaryPageTarget()?.model(ue.DOMModel.DOMModel);if(!o)return;let r=(await o.pushNodesByBackendIdsToFrontend(new Set([e])))?.get(e);return!r||r.frameId()!==this.mainFrameId?void 0:$t.DOMLinkifier.Linkifier.instance().linkify(r,{textContent:s})}async#t(e,s){let o=ue.TargetManager.TargetManager.instance().primaryPageTarget()?.model(ue.DOMModel.DOMModel);if(!o)return;let n=await o.pushNodeByPathToFrontend(e);if(!n)return;let r=o.nodeForId(n);return r?$t.DOMLinkifier.Linkifier.instance().linkify(r,{textContent:s}):void 0}};import"./../../ui/components/spinners/spinners.js";import*as ft from"./../../core/host/host.js";import*as ei from"./../../core/i18n/i18n.js";import*as ti from"./../../core/root/root.js";import*as Bt from"./../../models/ai_assistance/ai_assistance.js";import"./../../ui/components/buttons/buttons.js";import*as si from"./../../ui/legacy/legacy.js";import{Directives as Ao,html as ke,nothing as So,render as To}from"./../../ui/lit/lit.js";var fs={};J(fs,{PatchSuggestionState:()=>$,PatchWidget:()=>Re,isAiAssistancePatchingEnabled:()=>de});import"./../../ui/legacy/legacy.js";import"./../../ui/components/markdown_view/markdown_view.js";import"./../../ui/components/spinners/spinners.js";import"./../../ui/kit/kit.js";import*as ce from"./../../core/common/common.js";import*as Ee from"./../../core/host/host.js";import*as gs from"./../../core/i18n/i18n.js";import*as ms from"./../../core/platform/platform.js";import*as st from"./../../core/root/root.js";import*as Pe from"./../../models/ai_assistance/ai_assistance.js";import*as ps from"./../../models/greendev/greendev.js";import*as K from"./../../models/persistence/persistence.js";import*as G from"./../../models/workspace/workspace.js";import*as Rt from"./../../models/workspace_diff/workspace_diff.js";import"./../../ui/components/buttons/buttons.js";import*as ve from"./../../ui/legacy/legacy.js";import{Directives as tt,html as L,nothing as Z,render as Ni}from"./../../ui/lit/lit.js";import*as fe from"./../../ui/visual_logging/visual_logging.js";import*as us from"./../changes/changes.js";import*as it from"./../common/common.js";import"./../../ui/kit/kit.js";import*as Xe from"./../../core/common/common.js";import*as ls from"./../../core/host/host.js";import*as cs from"./../../core/i18n/i18n.js";import*as Mt from"./../../core/root/root.js";import*as ds from"./../../models/geometry/geometry.js";import*as X from"./../../models/persistence/persistence.js";import*as le from"./../../models/workspace/workspace.js";import"./../../ui/components/buttons/buttons.js";import*as et from"./../../ui/legacy/legacy.js";import{html as Me,nothing as Lt,render as Fi}from"./../../ui/lit/lit.js";var rs=`@scope to (devtools-widget > *){:scope{width:100%;box-shadow:none}.dialog-header{margin:var(--sys-size-6) var(--sys-size-8) var(--sys-size-5);font:var(--sys-typescale-headline5)}.buttons{margin:var(--sys-size-6) var(--sys-size-8) var(--sys-size-8);display:flex;justify-content:flex-start;gap:var(--sys-size-5)}.main-content{color:var(--sys-color-on-surface-subtle);margin:0 var(--sys-size-8);line-height:18px}.add-folder-button{margin-left:auto}ul{list-style-type:none;padding:0;margin:var(--sys-size-6) 0 var(--sys-size-4) 0;max-height:var(--sys-size-20);overflow-y:auto}li{display:flex;align-items:center;color:var(--sys-color-on-surface-subtle);border-radius:0 var(--sys-shape-corner-full) var(--sys-shape-corner-full) 0;height:var(--sys-size-10);margin:0 var(--sys-size-8);padding-left:var(--sys-size-9)}li:hover, li.selected{background-color:var(--sys-color-state-hover-on-subtle)}li:focus{background-color:var(--app-color-navigation-drawer-background-selected)}.folder-icon{color:var(--icon-file-default);margin-right:var(--sys-size-4)}li.selected .folder-icon{color:var(--icon-file-authored)}.select-project-root{margin-bottom:var(--sys-size-6)}.theme-with-dark-background, :host-context(.theme-with-dark-background){li:focus{color:var(--app-color-navigation-drawer-label-selected);background-color:var(--app-color-navigation-drawer-background-selected);& .folder-icon{color:var(--app-color-navigation-drawer-label-selected)}}}.ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
/*# sourceURL=${import.meta.resolve("././selectWorkspaceDialog.css")} */`;var N={selectFolder:"Select folder",selectFolderAccessibleLabel:"Select a folder to apply changes",cancel:"Cancel",select:"Select",addFolder:"Add folder",selectProjectRoot:"Source code from the selected folder is sent to Google. This data may be seen by human reviewers to improve this feature.",selectProjectRootNoLogging:"Source code from the selected folder is sent to Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time."},B=cs.i18n.lockedString,Ui=(t,e,s)=>{let i=t.folders.length>0;Fi(Me`
      <style>${rs}</style>
      <h2 class="dialog-header">${B(N.selectFolder)}</h2>
      <div class="main-content">
        <div class="select-project-root">${t.selectProjectRootText}</div>
        ${t.showAutomaticWorkspaceNudge?Me`
          <!-- Hardcoding, because there is no 'getFormatLocalizedString' equivalent for 'lockedString' -->
          <div>
            Tip: provide a
            <devtools-link
              class="devtools-link"
              href="https://goo.gle/devtools-automatic-workspace-folders"
              jslogcontext="automatic-workspaces-documentation"
            >com.chrome.devtools.json</devtools-link>
            file to automatically connect your project to DevTools.
          </div>
        `:Lt}
      </div>
      ${i?Me`
        <ul role="listbox" aria-label=${B(N.selectFolder)}
          aria-activedescendant=${t.folders.length>0?`option-${t.selectedIndex}`:""}>
          ${t.folders.map((o,n)=>{let r=`option-${n}`;return Me`
              <li
                id=${r}
                @mousedown=${()=>t.onProjectSelected(n)}
                @keydown=${t.onListItemKeyDown}
                class=${n===t.selectedIndex?"selected":""}
                aria-selected=${n===t.selectedIndex?"true":"false"}
                title=${o.path}
                role="option"
                tabindex=${n===t.selectedIndex?"0":"-1"}
              >
                <devtools-icon class="folder-icon" name="folder"></devtools-icon>
                <span class="ellipsis">${o.name}</span>
              </li>`})}
        </ul>
      `:Lt}
      <div class="buttons">
        <devtools-button
          title=${B(N.cancel)}
          aria-label="Cancel"
          .jslogContext=${"cancel"}
          @click=${t.onCancelButtonClick}
          .variant=${"outlined"}>${B(N.cancel)}</devtools-button>
        <devtools-button
          class="add-folder-button"
          title=${B(N.addFolder)}
          aria-label="Add folder"
          .iconName=${"plus"}
          .jslogContext=${"add-folder"}
          @click=${t.onAddFolderButtonClick}
          .variant=${i?"tonal":"primary"}>${B(N.addFolder)}</devtools-button>
        ${i?Me`
          <devtools-button
            title=${B(N.select)}
            aria-label="Select"
            @click=${t.onSelectButtonClick}
            .jslogContext=${"select"}
            .variant=${"primary"}>${B(N.select)}</devtools-button>
        `:Lt}
      </div>
    `,s)},Ze=class t extends et.Widget.VBox{#o;#t=le.Workspace.WorkspaceImpl.instance();#s=0;#a;#n;#r=X.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();#i=[];constructor(e,s){super(),this.#a=e.onProjectSelected,this.#n=e.dialog,this.#g(),e.currentProject&&(this.#s=Math.max(0,this.#i.findIndex(i=>i.project===e.currentProject))),this.#o=s??Ui,this.requestUpdate(),this.updateComplete.then(()=>{this.contentElement?.querySelector(".selected")?.focus()})}wasShown(){super.wasShown(),this.#t.addEventListener(le.Workspace.Events.ProjectAdded,this.#h,this),this.#t.addEventListener(le.Workspace.Events.ProjectRemoved,this.#d,this)}willHide(){super.willHide(),this.#t.removeEventListener(le.Workspace.Events.ProjectAdded,this.#h,this),this.#t.removeEventListener(le.Workspace.Events.ProjectRemoved,this.#d,this)}#m(e){switch(e.key){case"ArrowDown":{e.preventDefault(),this.#s=Math.min(this.#s+1,this.#i.length-1);let s=this.contentElement.querySelectorAll("li")[this.#s];s?.scrollIntoView({block:"nearest",inline:"nearest"}),s?.focus({preventScroll:!0}),this.requestUpdate();break}case"ArrowUp":{e.preventDefault(),this.#s=Math.max(this.#s-1,0);let s=this.contentElement.querySelectorAll("li")[this.#s];s?.scrollIntoView({block:"nearest",inline:"nearest"}),s?.focus({preventScroll:!0}),this.requestUpdate();break}case"Enter":e.preventDefault(),this.#e();break}}#e(){let e=this.#i[this.#s];e.project?(this.#n.hide(),this.#a(e.project)):this.#c()}performUpdate(){let e=Mt.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue===Mt.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING,s={folders:this.#i,selectedIndex:this.#s,selectProjectRootText:B(e?N.selectProjectRootNoLogging:N.selectProjectRoot),showAutomaticWorkspaceNudge:this.#r.automaticFileSystem===null&&this.#r.availability==="available",onProjectSelected:i=>{this.#s=i,this.requestUpdate()},onSelectButtonClick:this.#e.bind(this),onCancelButtonClick:()=>{this.#n.hide()},onAddFolderButtonClick:()=>{this.#p()},onListItemKeyDown:this.#m.bind(this)};this.#o(s,void 0,this.contentElement)}async#p(){await X.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem(),this.contentElement?.querySelector('[aria-label="Select"]')?.shadowRoot?.querySelector("button")?.focus()}async#c(){await this.#r.connectAutomaticFileSystem(!0)||this.#n.hide()}#g(){this.#i=[];let e=this.#r.automaticFileSystem;e&&this.#i.push({name:Xe.ParsedURL.ParsedURL.extractName(e.root),path:e.root,automaticFileSystem:e});let s=this.#t.projectsForType(le.Workspace.projectTypes.FileSystem).filter(i=>i instanceof X.FileSystemWorkspaceBinding.FileSystem&&i.fileSystem().type()===X.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT);for(let i of s){if(e&&i===this.#t.projectForFileSystemRoot(e.root)){this.#i[0].project=i;continue}this.#i.push({name:Xe.ParsedURL.ParsedURL.encodedPathToRawPathString(i.displayName()),path:Xe.ParsedURL.ParsedURL.urlToRawPathString(i.id(),ls.Platform.isWin()),project:i})}}#h(e){let s=e.data,i=this.#r.automaticFileSystem;if(i&&s===this.#t.projectForFileSystemRoot(i.root)){this.#n.hide(),this.#a(s);return}this.#g();let o=this.#i.findIndex(n=>n.project===s);o!==-1&&(this.#s=o),this.requestUpdate(),this.updateComplete.then(()=>{this.contentElement?.querySelector(".selected")?.scrollIntoView()})}#d(){let e=this.#s>=0&&this.#s<this.#i.length?this.#i[this.#s].project:null;if(this.#g(),e){let s=this.#i.findIndex(i=>i.project===e);this.#s=s===-1?Math.min(this.#i.length-1,this.#s):s}else this.#s=0;this.requestUpdate()}static show(e,s){let i=new et.Dialog.Dialog("select-workspace");i.setAriaLabel(N.selectFolderAccessibleLabel),i.setMaxContentSize(new ds.Size(384,340)),i.setSizeBehavior("SetExactWidthMaxHeight"),i.setDimmed(!0),new t({dialog:i,onProjectSelected:e,currentProject:s}).show(i.contentElement),i.show()}};var C={unsavedChanges:"Unsaved changes",applyingToWorkspace:"Applying to workspace\u2026",applyToWorkspace:"Apply to workspace",change:"Change",changeRootFolder:"Change project root folder",cancel:"Cancel",discard:"Discard",saveAll:"Save all",savedToDisk:"Saved to disk",codeDisclaimer:"Use code snippets with caution",applyToWorkspaceTooltip:"Source code from the selected folder is sent to Google to generate code suggestions.",applyToWorkspaceTooltipNoLogging:"Source code from the selected folder is sent to Google to generate code suggestions. This data will not be used to improve Google\u2019s AI models.",learnMore:"Learn more",freDisclaimerHeader:"Apply changes directly to your project\u2019s source code",freDisclaimerTextAiWontAlwaysGetItRight:"This feature uses AI and won\u2019t always get it right",freDisclaimerTextPrivacy:"To generate code suggestions, source code from the selected folder is sent to Google. This data may be seen by human reviewers to improve this feature.",freDisclaimerTextPrivacyNoLogging:"To generate code suggestions, source code from the selected folder is sent to Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time.",freDisclaimerTextUseWithCaution:"Use generated code snippets with caution",viewUploadedFiles:"View data sent to Google",opensInNewTab:"(opens in a new tab)",genericErrorMessage:"Changes couldn\u2019t be applied to your workspace."},A=gs.i18n.lockedString,zi="https://support.google.com/legal/answer/13505487",{widget:hs}=ve.Widget,$;(function(t){t.INITIAL="initial",t.LOADING="loading",t.SUCCESS="success",t.ERROR="error"})($||($={}));var ee;(function(t){t.NONE="none",t.REGULAR="regular",t.AUTOMATIC_DISCONNECTED="automaticDisconnected",t.AUTOMATIC_CONNECTED="automaticConnected"})(ee||(ee={}));var ji=(t,e,s)=>{if(!t.changeSummary&&t.patchSuggestionState===$.INITIAL)return;e.changeRef=e.changeRef??tt.createRef(),e.summaryRef=e.summaryRef??tt.createRef();function i(){return t.sources?L`<devtools-link
          class="link"
          title="${C.viewUploadedFiles} ${C.opensInNewTab}"
          href="data:text/plain;charset=utf-8,${encodeURIComponent(t.sources)}"
          jslogcontext="files-used-in-patching">
          ${C.viewUploadedFiles}
        </devtools-link>`:Z}function o(){return t.savedToDisk?L`
            <devtools-icon class="green-bright-icon summary-badge" name="check-circle"></devtools-icon>
            <span class="header-text">
              ${A(C.savedToDisk)}
            </span>
          `:t.patchSuggestionState===$.SUCCESS?L`
            <devtools-icon class="on-tonal-icon summary-badge" name="difference"></devtools-icon>
            <span class="header-text">
              ${A(`File changes in ${t.projectName}`)}
            </span>
            <devtools-icon
              class="arrow"
              name="chevron-down"
            ></devtools-icon>
          `:L`
          <devtools-icon class="on-tonal-icon summary-badge" name="pen-spark"></devtools-icon>
          <span class="header-text">
            ${A(C.unsavedChanges)}
          </span>
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        `}function n(){return!t.changeSummary&&t.patchSuggestionState===$.INITIAL||t.savedToDisk?Z:t.patchSuggestionState===$.SUCCESS?L`${hs(us.CombinedDiffView.CombinedDiffView,{workspaceDiff:t.workspaceDiff,ignoredUrls:["inspector://"]})}`:L`<devtools-code-block
          .code=${t.changeSummary??""}
          .codeLang=${"css"}
          .displayNotice=${!0}
        ></devtools-code-block>
        ${t.patchSuggestionState===$.ERROR?L`<div class="error-container">
              <devtools-icon name="cross-circle-filled"></devtools-icon>${A(C.genericErrorMessage)} ${i()}
            </div>`:Z}`}function r(f){return!ps.Prototypes.instance().isEnabled("copyToGemini")||!f?Z:L`<devtools-widget class="copy-to-prompt"
      ${hs(it.CopyChangesToPrompt,{workspaceDiff:t.workspaceDiff,patchAgentCSSChange:f})}></devtools-widget>`}function c(){if(t.savedToDisk)return Z;if(t.patchSuggestionState===$.SUCCESS)return L`
          <div class="footer">
            <div class="left-side">
              <devtools-link class="link disclaimer-link" href="https://support.google.com/legal/answer/13505487" jslogcontext="code-disclaimer">
                ${A(C.codeDisclaimer)}
              </devtools-link>
              ${i()}
            </div>
            <div class="save-or-discard-buttons">
              <devtools-button
                @click=${t.onDiscard}
                .jslogContext=${"patch-widget.discard"}
                .variant=${"outlined"}>
                  ${A(C.discard)}
              </devtools-button>
              <devtools-button
                @click=${t.onSaveAll}
                .jslogContext=${"patch-widget.save-all"}
                .variant=${"primary"}>
                  ${A(C.saveAll)}
              </devtools-button>
            </div>
          </div>
          `;let f=t.projectType===ee.AUTOMATIC_DISCONNECTED?"folder-off":t.projectType===ee.AUTOMATIC_CONNECTED?"folder-asterisk":"folder";return L`
        <div class="footer">
          ${t.projectName?L`
            <div class="change-workspace" jslog=${fe.section("patch-widget.workspace")}>
                <devtools-icon .name=${f}></devtools-icon>
                <span class="folder-name" title=${t.projectPath}>${t.projectName}</span>
              ${t.onChangeWorkspaceClick?L`
                <devtools-button
                  @click=${t.onChangeWorkspaceClick}
                  .jslogContext=${"change-workspace"}
                  .variant=${"text"}
                  .title=${A(C.changeRootFolder)}
                  .disabled=${t.patchSuggestionState===$.LOADING}
                  ${tt.ref(e.changeRef)}
                >${A(C.change)}</devtools-button>
              `:Z}
            </div>
          `:Z}
          <div class="apply-to-workspace-container" aria-live="polite">
            ${t.patchSuggestionState===$.LOADING?L`
              <div class="loading-text-container" jslog=${fe.section("patch-widget.apply-to-workspace-loading")}>
                <devtools-spinner></devtools-spinner>
                <span>
                  ${A(C.applyingToWorkspace)}
                </span>
              </div>
            `:L`
               ${r(t.changeSummary)}
                <devtools-button
                @click=${t.onApplyToWorkspace}
                .jslogContext=${"patch-widget.apply-to-workspace"}
                .variant=${"outlined"}>
                ${A(C.applyToWorkspace)}
              </devtools-button>
            `}
            ${t.patchSuggestionState===$.LOADING?L`<devtools-button
              @click=${t.onCancel}
              .jslogContext=${"cancel"}
              .variant=${"outlined"}>
              ${A(C.cancel)}
            </devtools-button>`:Z}
            <devtools-button
              aria-details="info-tooltip"
              .jslogContext=${"patch-widget.info-tooltip-trigger"}
              .iconName=${"info"}
              .variant=${"icon"}
            ></devtools-button>
            <devtools-tooltip
                id="info-tooltip"
                variant="rich"
              >
             <div class="info-tooltip-container">
               ${t.applyToWorkspaceTooltipText}
               <button
                 class="link tooltip-link"
                 role="link"
                 jslog=${fe.link("open-ai-settings").track({click:!0})}
                 @click=${t.onLearnMoreTooltipClick}
               >${A(C.learnMore)}</button>
             </div>
            </devtools-tooltip>
          </div>
        </div>`}let a=t.savedToDisk?L`
          <div class="change-summary saved-to-disk" role="status" aria-live="polite">
            <div class="header-container">
             ${o()}
             </div>
          </div>`:L`
          <details class="change-summary" jslog=${fe.section("patch-widget")}>
            <summary class="header-container" ${tt.ref(e.summaryRef)}>
              ${o()}
            </summary>
            ${n()}
            ${c()}
          </details>
        `;Ni(a,s)},Re=class extends ve.Widget.Widget{changeSummary="";changeManager;#o=ce.Settings.Settings.instance().createSetting("ai-assistance-patching-fre-completed",!1);#t=ce.Settings.Settings.instance().createSetting("ai-assistance-patching-selected-project-id","");#s;#a={};#n;#r;#i;#m;#e;#p;#c=$.INITIAL;#g=Rt.WorkspaceDiff.workspaceDiff();#h=G.Workspace.WorkspaceImpl.instance();#d=K.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().automaticFileSystem;#u=!1;#f=null;constructor(e,s=ji,i){super(e),this.#n=i?.aidaClient??new Ee.AidaClient.AidaClient,this.#p=st.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue===st.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING,this.#s=s,this.requestUpdate()}#w(){ve.ViewManager.ViewManager.instance().showView("chrome-ai")}#v(){return this.#i?{projectName:ce.ParsedURL.ParsedURL.encodedPathToRawPathString(this.#i.displayName()),projectPath:ce.ParsedURL.ParsedURL.urlToRawPathString(this.#i.id(),Ee.Platform.isWin())}:this.#d?{projectName:ce.ParsedURL.ParsedURL.extractName(this.#d.root),projectPath:this.#d.root}:{projectName:"",projectPath:ms.DevToolsPath.EmptyRawPathString}}#b(){let e=this.#d?this.#h.projectForFileSystemRoot(this.#d.root):null;return this.#h.projectsForType(G.Workspace.projectTypes.FileSystem).filter(i=>i instanceof K.FileSystemWorkspaceBinding.FileSystem&&i.fileSystem().type()===K.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT).filter(i=>i!==e).length>0}#C(e){return this.#d&&this.#d.root===e?this.#i?ee.AUTOMATIC_CONNECTED:ee.AUTOMATIC_DISCONNECTED:this.#i?ee.NONE:ee.REGULAR}performUpdate(){let{projectName:e,projectPath:s}=this.#v();this.#s({workspaceDiff:this.#g,changeSummary:this.changeSummary,patchSuggestionState:this.#c,sources:this.#m,projectName:e,projectPath:s,projectType:this.#C(s),savedToDisk:this.#e,applyToWorkspaceTooltipText:this.#p?A(C.applyToWorkspaceTooltipNoLogging):A(C.applyToWorkspaceTooltip),onLearnMoreTooltipClick:this.#w.bind(this),onApplyToWorkspace:this.#F.bind(this),onCancel:()=>{this.#r?.abort()},onDiscard:this.#S.bind(this),onSaveAll:this.#T.bind(this),onChangeWorkspaceClick:this.#b()?this.#A.bind(this,{applyPatch:!1}):void 0},this.#a,this.contentElement)}wasShown(){super.wasShown(),this.#M(),de()&&(this.#h.addEventListener(G.Workspace.Events.ProjectAdded,this.#R,this),this.#h.addEventListener(G.Workspace.Events.ProjectRemoved,this.#E,this))}willHide(){super.willHide(),this.#u=!1,de()&&(this.#h.removeEventListener(G.Workspace.Events.ProjectAdded,this.#R,this),this.#h.removeEventListener(G.Workspace.Events.ProjectRemoved,this.#E,this))}async#l(){if(this.#o.get())return!0;let s=Pe.AiUtils.getIconName(),i=await it.FreDialog.show({header:{iconName:s,text:A(C.freDisclaimerHeader)},reminderItems:[{iconName:"psychiatry",content:A(C.freDisclaimerTextAiWontAlwaysGetItRight)},{iconName:"google",content:this.#p?A(C.freDisclaimerTextPrivacyNoLogging):A(C.freDisclaimerTextPrivacy)},{iconName:"warning",content:L`<devtools-link
            href=${zi}
            class="link devtools-link"
            jslogcontext="code-snippets-explainer.patch-widget"
          >${A(C.freDisclaimerTextUseWithCaution)}</devtools-link>`}],onLearnMoreClick:()=>{ve.ViewManager.ViewManager.instance().showView("chrome-ai")},ariaLabel:A(C.freDisclaimerHeader),learnMoreButtonText:A(C.learnMore)});return i&&this.#o.set(!0),i}#M(){let e=this.#d?this.#h.projectForFileSystemRoot(this.#d.root):this.#h.project(this.#t.get());e?this.#i=e:(this.#i=void 0,this.#t.set("")),this.requestUpdate()}#R(e){let s=e.data;this.#u&&this.#d&&s===this.#h.projectForFileSystemRoot(this.#d.root)?(this.#u=!1,this.#i=s,this.#k()):this.#i===void 0&&this.#M()}#E(){this.#i&&!this.#h.project(this.#i.id())&&(this.#t.set(""),this.#i=void 0,this.requestUpdate())}#A(e={applyPatch:!1}){let s=i=>{this.#i=i,this.#t.set(i.id()),e.applyPatch?this.#k():(this.requestUpdate(),this.updateComplete.then(()=>{this.contentElement?.querySelector(".apply-to-workspace-container devtools-button")?.shadowRoot?.querySelector("button")?.focus()}))};Ze.show(s,this.#i)}async#F(){!de()||!await this.#l()||(this.#i?await this.#k():this.#d?(this.#u=!0,await K.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().connectAutomaticFileSystem(!0)):this.#A({applyPatch:!0}))}get#I(){return this.#g.modifiedUISourceCodes().filter(e=>!e.url().startsWith("inspector://"))}async#k(){let e=this.changeSummary;if(!e)throw new Error("Change summary does not exist");this.#c=$.LOADING,this.#f=null,this.requestUpdate();let{response:s,processedFiles:i}=await this.#$(e);s&&"rpcId"in s&&s.rpcId&&(this.#f=s.rpcId);let o=this.#I.length>0;s?.type==="answer"&&o?this.#c=$.SUCCESS:s?.type==="error"&&s.error==="abort"?this.#c=$.INITIAL:this.#c=$.ERROR,this.#m=`Filenames in ${this.#i?.displayName()}.
Files:
${i.map(n=>`* ${n}`).join(`
`)}`,this.requestUpdate(),this.#c===$.SUCCESS&&this.updateComplete.then(()=>{this.#a.summaryRef?.value?.focus()})}#S(){for(let e of this.#I)e.resetWorkingCopy();this.#c=$.INITIAL,this.#m=void 0,this.changeManager?.popStashedChanges(),this.#x("NEGATIVE"),this.requestUpdate(),this.updateComplete.then(()=>{this.#a.changeRef?.value?.focus()})}#T(){for(let e of this.#I)e.commitWorkingCopy();this.changeManager?.stashChanges().then(()=>{this.changeManager?.dropStashedChanges()}),this.#e=!0,this.#x("POSITIVE"),this.requestUpdate()}#x(e){this.#f&&this.#n.registerClientEvent({corresponding_aida_rpc_global_id:this.#f,disable_user_content_logging:!0,do_conversation_client_event:{user_feedback:{sentiment:e}}})}async#$(e){if(!this.#i)throw new Error("Project does not exist");this.#r=new AbortController;let s=new Pe.PatchAgent.PatchAgent({aidaClient:this.#n,serverSideLoggingEnabled:!1,project:this.#i}),{responses:i,processedFiles:o}=await s.applyChanges(e,{signal:this.#r.signal});return{response:i.at(-1),processedFiles:o}}};function de(){return!!st.Runtime.hostConfig.devToolsFreestyler?.patching}window.aiAssistanceTestPatchPrompt=async(t,e,s)=>{if(!de())return;let i=Rt.WorkspaceDiff.workspaceDiff(),n=G.Workspace.WorkspaceImpl.instance().projectsForType(G.Workspace.projectTypes.FileSystem).filter(a=>a instanceof K.FileSystemWorkspaceBinding.FileSystem&&a.fileSystem().type()===K.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT).find(a=>a.displayName()===t);if(!n)throw new Error("project not found");let r=new Ee.AidaClient.AidaClient,c=new Pe.PatchAgent.PatchAgent({aidaClient:r,serverSideLoggingEnabled:!1,project:n});try{let a=[],{processedFiles:f,responses:x}=await c.applyChanges(e);if(x.at(-1)?.type==="error")return{error:"failed to patch",debugInfo:{responses:x,processedFiles:f}};for(let U of f){let $e=s.find(re=>re.path===U);if(!$e){a.push(`Patched ${U} that was not expected`);break}let Le=await c.agentProject.readFile(U);if(!Le)throw new Error(`${U} has no content`);for(let re of $e.matches)Le.match(new RegExp(re,"gm"))||a.push({message:`Did not match ${re} in ${U}`,file:U,content:Le});for(let re of $e.doesNotMatch||[])Le.match(new RegExp(re,"gm"))&&a.push({message:`Unexpectedly matched ${re} in ${U}`,file:U,content:Le})}return{assertionFailures:a,debugInfo:{responses:x,processedFiles:f}}}finally{i.modifiedUISourceCodes().forEach(a=>{a.resetWorkingCopy()})}};var Cs={};J(Cs,{ChatInput:()=>ye,DEFAULT_VIEW:()=>ks});import"./../../ui/components/tooltips/tooltips.js";import*as nt from"./../../core/i18n/i18n.js";import*as z from"./../../core/sdk/sdk.js";import*as E from"./../../models/ai_assistance/ai_assistance.js";import*as bs from"./../common/common.js";import*as Et from"./../utils/utils.js";import"./../../ui/components/buttons/buttons.js";import*as xs from"./../../ui/components/input/input.js";import*as Pt from"./../../ui/components/snackbars/snackbars.js";import*as te from"./../../ui/legacy/legacy.js";import*as M from"./../../ui/lit/lit.js";import*as se from"./../../ui/visual_logging/visual_logging.js";var vs=`*{box-sizing:border-box;margin:0;padding:0}:host{display:flex;flex-direction:column}.input-form{display:flex;flex-direction:column;padding:0 var(--sys-size-5) var(--sys-size-5) var(--sys-size-5);max-width:var(--sys-size-36);background-color:var(--sys-color-cdt-base-container);width:100%}.chat-readonly-container{display:flex;width:100%;max-width:var(--sys-size-36);justify-content:center;align-items:center;background-color:var(--sys-color-surface3);font:var(--sys-typescale-body4-regular);padding:var(--sys-size-5) 0;border-radius:var(--sys-shape-corner-medium-small);margin-bottom:var(--sys-size-5);color:var(--sys-color-on-surface-subtle)}.chat-input-container{width:100%;display:flex;position:relative;flex-direction:column;border:1px solid var(--sys-color-neutral-outline);border-radius:var(--sys-shape-corner-small);&:focus-within{outline:1px solid var(--sys-color-primary);border-color:var(--sys-color-primary)}&.disabled{background-color:var(--sys-color-state-disabled-container);border-color:transparent;& .chat-input-disclaimer{border-color:var(--sys-color-state-disabled)}}&.single-line-layout{flex-direction:row;justify-content:space-between;.chat-input{flex-shrink:1;padding:var(--sys-size-4)}.chat-input-actions{flex-shrink:0;padding-block:0;align-items:flex-end;padding-bottom:var(--sys-size-1)}}& .image-input-container{margin:var(--sys-size-3) var(--sys-size-4) 0;max-width:100%;width:fit-content;position:relative;devtools-button{position:absolute;top:calc(-1 * var(--sys-size-2));right:calc(-1 * var(--sys-size-3));border-radius:var(--sys-shape-corner-full);border:1px solid var(--sys-color-neutral-outline);background-color:var(--sys-color-cdt-base-container)}img{max-height:var(--sys-size-18);max-width:100%;border:1px solid var(--sys-color-neutral-outline);border-radius:var(--sys-shape-corner-small)}.loading{margin:var(--sys-size-4) 0;display:inline-flex;justify-content:center;align-items:center;height:var(--sys-size-18);width:var(--sys-size-19);background-color:var(--sys-color-surface3);border-radius:var(--sys-shape-corner-small);border:1px solid var(--sys-color-neutral-outline);devtools-spinner{color:var(--sys-color-state-disabled)}}}& .chat-input-disclaimer-container{display:flex;align-items:center;padding-right:var(--sys-size-3);flex-shrink:0}& .chat-input-disclaimer{display:flex;justify-content:center;align-items:center;font:var(--sys-typescale-body5-regular);border-right:1px solid var(--sys-color-divider);padding-right:8px;&.hide-divider{border-right:none}}@container --chat-ui-container (width < 400px){& .chat-input-disclaimer-container{display:none}}}.chat-input{scrollbar-width:none;field-sizing:content;resize:none;width:100%;max-height:84px;border:0;border-radius:var(--sys-shape-corner-small);font:var(--sys-typescale-body4-regular);line-height:18px;min-height:var(--sys-size-11);color:var(--sys-color-on-surface);background-color:var(--sys-color-cdt-base-container);padding:var(--sys-size-4) var(--sys-size-4) var(--sys-size-3) var(--sys-size-4);&::placeholder{opacity:60%}&:focus-visible{outline:0}&:disabled{color:var(--sys-color-state-disabled);background-color:transparent;border-color:transparent;&::placeholder{color:var(--sys-color-on-surface-subtle);opacity:100%}}}.chat-input-actions{display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding-left:var(--sys-size-4);padding-right:var(--sys-size-2);gap:var(--sys-size-6);padding-bottom:var(--sys-size-2);& .chat-input-actions-left{flex:1 1 0;min-width:0}& .chat-input-actions-right{flex-shrink:0;display:flex;& .start-new-chat-button{padding-bottom:var(--sys-size-2);padding-right:var(--sys-size-3)}}}.chat-inline-button{padding-left:3px}.select-element{display:flex;gap:var(--sys-size-3);align-items:center;.resource-link{display:flex;background-color:var(--sys-color-cdt-base-container);align-items:center;cursor:pointer;padding:var(--sys-size-2) var(--sys-size-3);font:var(--sys-typescale-body5-regular);border:var(--sys-size-1) solid var(--sys-color-divider);border-radius:var(--sys-shape-corner-extra-small);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;line-height:1;& .title{vertical-align:middle;padding-right:var(--sys-size-2);font:var(--sys-typescale-body5-regular);overflow:hidden;text-overflow:ellipsis}& .remove-context,
    & .add-context{vertical-align:middle}&:focus-visible{outline:2px solid var(--sys-color-state-focus-ring)}devtools-icon,
    devtools-file-source-icon{display:inline-flex;vertical-align:middle;min-width:var(--sys-size-7);min-height:var(--sys-size-7)}&.disabled{border-style:dashed;border-color:var(--sys-color-neutral-outline);color:var(--sys-color-on-surface-light);devtools-icon,
      devtools-file-source-icon{--override-file-source-icon-color:var(
          --sys-color-on-surface-light-graphics
        );color:var(--sys-color-on-surface-light-graphics)!important}.title{color:var(--sys-color-on-surface-light);font-style:italic}}.network-override-marker{position:relative;float:left}.network-override-marker::before{content:var(--image-file-empty);width:var(--sys-size-4);height:var(--sys-size-4);border-radius:50%;outline:var(--sys-size-1) solid var(--icon-gap-focus-selected);left:11px;position:absolute;top:13px;z-index:1;background-color:var(--sys-color-purple-bright)}.image.icon{display:inline-flex;justify-content:center;align-items:center;vertical-align:middle;margin-right:var(--sys-size-3);img{max-width:var(--sys-size-7);max-height:var(--sys-size-7)}}}}.link{color:var(--text-link);text-decoration:underline;cursor:pointer}button.link{border:none;background:none;font:inherit;&:focus-visible{outline:var(--sys-size-2) solid var(--sys-color-state-focus-ring);outline-offset:0;border-radius:var(--sys-shape-corner-extra-small)}}.floaty{font:var(--sys-typescale-body4);color:var(--sys-color-on-surface);user-select:none;padding:0;margin:0;list-style-type:none;display:flex;flex-flow:row wrap;align-items:flex-end;gap:var(--sys-size-2);margin-bottom:var(--sys-size-2);li{background:var(--sys-color-surface3);border-radius:var(--sys-shape-corner-small);border:1px solid var(--sys-color-neutral-outline);padding:var(--sys-size-2) var(--sys-size-3);display:flex;flex-direction:row;align-items:center;gap:var(--sys-size-2);min-height:var(--sys-size-8)}.context-item{display:flex;flex-direction:row;align-items:center;gap:var(--sys-size-2)}.open-floaty{padding:0;border:none;margin-bottom:1px}}.chat-input-footer{display:flex;justify-content:center;padding-block:var(--sys-size-3);font:var(--sys-typescale-body5-regular);border-top:1px solid var(--sys-color-divider);text-wrap:balance;text-align:center;width:100%;&:not(.is-read-only){display:none;border:none;@container --chat-ui-container (width < 400px){display:flex}}}
/*# sourceURL=${import.meta.resolve("././components/chatInput.css")} */`;var{html:I,Directives:{createRef:Wi,ref:Oi}}=M,{widget:Vi}=te.Widget,De={inputTextAriaDescription:"You can also use one of the suggested prompts above to start your conversation",revealContextDescription:"Reveal the selected context item in DevTools",learnAbout:"Learn about AI in DevTools"},k={sendButtonTitle:"Send",startNewChat:"Start new chat",cancelButtonTitle:"Cancel",selectAnElement:"Select an element",takeScreenshotButtonTitle:"Take screenshot",removeImageInputButtonTitle:"Remove image input",addImageButtonTitle:"Add image",pastConversation:"You're viewing a past conversation.",screenshotFailureMessage:"Failed to take a screenshot. Please try again.",uploadImageFailureMessage:"Failed to upload image. Please try again.",addContext:"Add item for context",removeContextElement:"Remove element from context",removeContextRequest:"Remove request from context",removeContextFile:"Remove file from context",removeContextPerfInsight:"Remove performance insight from context",removeContext:"Remove from context"},Bi=nt.i18n.registerUIStrings("panels/ai_assistance/components/ChatInput.ts",De),ot=nt.i18n.getLocalizedString.bind(void 0,Bi),b=nt.i18n.lockedString,qi=80,Hi="image/jpeg",ys=100,_i="relevant-data-link-chat",Gi="relevant-data-link-footer";function ws(t){return t instanceof E.FileAgent.FileContext?b(k.removeContextFile):t instanceof E.StylingAgent.NodeContext?b(k.removeContextElement):t instanceof E.NetworkAgent.RequestContext?b(k.removeContextRequest):t instanceof E.PerformanceAgent.PerformanceTraceContext?b(k.removeContextPerfInsight):b(k.removeContext)}var ks=(t,e,s)=>{let i=M.Directives.classMap({"chat-input-container":!0,"single-line-layout":!t.context,disabled:t.isTextInputDisabled}),o=n=>{let r=M.Directives.classMap({"chat-input-disclaimer":!0,"hide-divider":!t.isLoading&&t.blockedByCrossOrigin});return I`
      <div class=${r}>
        <button
          class="link"
          role="link"
          aria-details=${n}
          jslog=${se.link("open-ai-settings").track({click:!0})}
          @click=${c=>{c.preventDefault(),te.ViewManager.ViewManager.instance().showView("chrome-ai")}}
        >${b("Relevant data")}</button>&nbsp;${b("is sent to Google")}
        <devtools-tooltip
          id=${n}
          variant="rich"
        ><div class="info-tooltip-container">
          ${t.disclaimerText}
          <button
            class="link tooltip-link"
            role="link"
            jslog=${se.link("open-ai-settings").track({click:!0})}
            @click=${()=>{te.ViewManager.ViewManager.instance().showView("chrome-ai")}}>${ot(De.learnAbout)}
          </button>
        </div></devtools-tooltip>
      </div>
    `};M.render(I`
    <style>${xs.textInputStyles}</style>
    <style>${vs}</style>
    ${t.isReadOnly?I`
        <div
          class="chat-readonly-container"
          jslog=${se.section("read-only")}
        >
          <span>${b(k.pastConversation)}</span>
          <devtools-button
            aria-label=${b(k.startNewChat)}
            class="chat-inline-button"
            @click=${t.onNewConversation}
            .data=${{variant:"text",title:b(k.startNewChat),jslogContext:"start-new-chat"}}
          >${b(k.startNewChat)}</devtools-button>
        </div>`:I`
        <form class="input-form" @submit=${t.onSubmit}>
          <div class=${i}>
            ${t.multimodalInputEnabled&&t.imageInput&&!t.isTextInputDisabled?I`
                <div class="image-input-container">
                  <devtools-button
                    aria-label=${b(k.removeImageInputButtonTitle)}
                    @click=${t.onRemoveImageInput}
                    .data=${{variant:"icon",size:"MICRO",iconName:"cross",title:b(k.removeImageInputButtonTitle)}}
                  ></devtools-button>
                  ${t.imageInput.isLoading?I`
                      <div class="loading">
                        <devtools-spinner></devtools-spinner>
                      </div>`:I`
                      <img src="data:${t.imageInput.mimeType};base64, ${t.imageInput.data}" alt="Image input" />`}
                </div>`:M.nothing}
            <textarea
              class="chat-input"
              .disabled=${t.isTextInputDisabled}
              wrap="hard"
              maxlength="10000"
              @keydown=${t.onTextAreaKeyDown}
              @paste=${t.onImagePaste}
              @dragover=${t.onImageDragOver}
              @drop=${t.onImageDrop}
              @input=${n=>{t.onTextInputChange(n.target.value)}}
              placeholder=${t.inputPlaceholder}
              jslog=${se.textField("query").track({change:!0,keydown:"Enter"})}
              aria-description=${ot(De.inputTextAriaDescription)}
              ${Oi(t.textAreaRef)}
            ></textarea>
            <div class="chat-input-actions">
              <div class="chat-input-actions-left">
                ${t.context?I`
                    <div class="select-element">
                      ${t.conversationType==="freestyler"?I`
                          <devtools-button
                            .data=${{variant:"icon_toggle",size:"SMALL",iconName:"select-element",toggledIconName:"select-element",toggleType:"primary-toggle",toggled:t.inspectElementToggled,title:b(k.selectAnElement),jslogContext:"select-element",disabled:t.isTextInputDisabled}}
                            @click=${t.onInspectElementClick}
                          ></devtools-button>`:M.nothing}
                      <div
                        class=${M.Directives.classMap({"resource-link":!0,disabled:!t.isContextSelected})}
                      >
                        ${t.context instanceof E.StylingAgent.NodeContext?I`
                              <devtools-widget
                                class="title"
                                ${Vi(bs.DOMLinkifier.DOMNodeLink,{node:t.context.getItem(),options:{disabled:!t.isContextSelected,hiddenClassList:t.context.getItem().classNames().filter(n=>n.startsWith(E.Injected.AI_ASSISTANCE_CSS_CLASS_NAME)),ariaDescription:ot(De.revealContextDescription)}})}
                              ></devtools-widget>`:I`
                          ${t.context instanceof E.NetworkAgent.RequestContext?Et.PanelUtils.getIconForNetworkRequest(t.context.getItem()):t.context instanceof E.FileAgent.FileContext?Et.PanelUtils.getIconForSourceFile(t.context.getItem()):t.context instanceof E.AccessibilityAgent.AccessibilityContext?I`<devtools-icon class="icon" name="performance" title="Lighthouse"></devtools-icon>`:t.context instanceof E.PerformanceAgent.PerformanceTraceContext?I`<devtools-icon class="icon" name="performance" title="Performance"></devtools-icon>`:M.nothing}
                            <span
                              role="button"
                              class="title"
                              tabindex="0"
                              @click=${t.onContextClick}
                              @keydown=${n=>{(n.key==="Enter"||n.key===" ")&&t.onContextClick()}}
                              aria-description=${ot(De.revealContextDescription)}
                            >${t.context.getTitle()}</span>`}
                        ${t.isContextSelected&&t.onContextRemoved?I`
                                  <devtools-button
                                    title=${ws(t.context)}
                                    aria-label=${ws(t.context)}
                                    class="remove-context"
                                    .iconName=${"cross"}
                                    .size=${"MICRO"}
                                    .jslogContext=${"context-removed"}
                                    .variant=${"icon"}
                                    @click=${t.onContextRemoved}></devtools-button>`:M.nothing}
                      ${!t.isContextSelected&&t.onContextAdd?I`
                                    <devtools-button
                                      title=${b(k.addContext)}
                                      aria-label=${b(k.addContext)}
                                      class="add-context"
                                      .iconName=${"plus"}
                                      .size=${"MICRO"}
                                      .jslogContext=${"context-added"}
                                      .variant=${"icon"}
                                      @click=${t.onContextAdd}></devtools-button>`:M.nothing}
                      </div>
                    </div>`:M.nothing}
              </div>
              <div class="chat-input-actions-right">
                <div class="chat-input-disclaimer-container">
                  ${o(_i)}
                </div>
                ${t.multimodalInputEnabled&&!t.blockedByCrossOrigin?I`
                    ${t.uploadImageInputEnabled?I`
                        <devtools-button
                          class="chat-input-button"
                          aria-label=${b(k.addImageButtonTitle)}
                          @click=${t.onImageUpload}
                          .data=${{variant:"icon",size:"REGULAR",disabled:t.isTextInputDisabled||t.imageInput?.isLoading,iconName:"add-photo",title:b(k.addImageButtonTitle),jslogContext:"upload-image"}}
                        ></devtools-button>`:M.nothing}
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${b(k.takeScreenshotButtonTitle)}
                      @click=${t.onTakeScreenshot}
                      .data=${{variant:"icon",size:"REGULAR",disabled:t.isTextInputDisabled||t.imageInput?.isLoading,iconName:"photo-camera",title:b(k.takeScreenshotButtonTitle),jslogContext:"take-screenshot"}}
                    ></devtools-button>`:M.nothing}
                ${t.isLoading?I`
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${b(k.cancelButtonTitle)}
                      @click=${t.onCancel}
                      .data=${{variant:"icon",size:"REGULAR",iconName:"record-stop",title:b(k.cancelButtonTitle),jslogContext:"stop"}}
                    ></devtools-button>`:t.blockedByCrossOrigin?I`
                      <devtools-button
                        class="start-new-chat-button"
                        aria-label=${b(k.startNewChat)}
                        @click=${t.onNewConversation}
                        .data=${{variant:"outlined",size:"SMALL",title:b(k.startNewChat),jslogContext:"start-new-chat"}}
                      >${b(k.startNewChat)}</devtools-button>`:I`
                      <devtools-button
                        class="chat-input-button"
                        aria-label=${b(k.sendButtonTitle)}
                        .data=${{type:"submit",variant:"icon",size:"REGULAR",disabled:t.isTextInputDisabled||t.isTextInputEmpty||t.imageInput?.isLoading,iconName:"send",title:b(k.sendButtonTitle),jslogContext:"send"}}
                      ></devtools-button>`}
              </div>
            </div>
          </div>
        </form>`}
    <footer
      class=${M.Directives.classMap({"chat-input-footer":!0,"is-read-only":t.isReadOnly})}
      jslog=${se.section("footer")}
    >
      ${o(Gi)}
    </footer>
  `,s)},ye=class extends te.Widget.Widget{isLoading=!1;blockedByCrossOrigin=!1;isTextInputDisabled=!1;inputPlaceholder="";context=null;isContextSelected=!1;inspectElementToggled=!1;disclaimerText="";conversationType="freestyler";multimodalInputEnabled=!1;uploadImageInputEnabled=!1;isReadOnly=!1;#o=Wi();#t;setInputValue(e){this.#o.value&&(this.#o.value.value=e),this.performUpdate()}#s(){return!this.#o.value?.value?.trim()}onTextSubmit=()=>{};onContextClick=()=>{};onInspectElementClick=()=>{};onCancelClick=()=>{};onNewConversation=()=>{};onContextRemoved=null;onContextAdd=null;async#a(){let e=z.TargetManager.TargetManager.instance().primaryPageTarget();if(!e)throw new Error("Could not find main target");let s=e.model(z.ScreenCaptureModel.ScreenCaptureModel);if(!s)throw new Error("Could not find model");let i=setTimeout(()=>{this.#t={isLoading:!0},this.performUpdate()},ys),o=await s.captureScreenshot("jpeg",qi,"fromViewport");clearTimeout(i),o?(this.#t={isLoading:!1,data:o,mimeType:Hi,inputType:"screenshot"},this.performUpdate(),this.updateComplete.then(()=>{this.focusTextInput()})):(this.#t=void 0,this.performUpdate(),Pt.Snackbar.Snackbar.show({message:b(k.screenshotFailureMessage)}))}targetAdded(e){}targetRemoved(e){}#n(){this.#t=void 0,this.performUpdate(),this.updateComplete.then(()=>{this.focusTextInput()})}#r(e,s){if(this.conversationType!=="freestyler")return;let i=e?.files;if(!i||i.length===0)return;let o=Array.from(i).find(n=>n.type.startsWith("image/"));o&&(s.preventDefault(),this.#p(o))}#i=e=>{this.#r(e.clipboardData,e)};#m=e=>{this.conversationType==="freestyler"&&e.preventDefault()};#e=e=>{this.#r(e.dataTransfer,e)};async#p(e){let s=setTimeout(()=>{this.#t={isLoading:!0},this.performUpdate()},ys);try{let i=new FileReader,o=await new Promise((c,a)=>{i.onload=()=>{typeof i.result=="string"?c(i.result):a(new Error("FileReader result was not a string."))},i.readAsDataURL(e)}),n=o.indexOf(","),r=o.substring(n+1);this.#t={isLoading:!1,data:r,mimeType:e.type,inputType:"uploaded-image"}}catch{this.#t=void 0,Pt.Snackbar.Snackbar.show({message:b(k.uploadImageFailureMessage)})}clearTimeout(s),this.performUpdate(),this.updateComplete.then(()=>{this.focusTextInput()})}#c;constructor(e,s){super(e),this.#c=s??ks}wasShown(){super.wasShown(),z.TargetManager.TargetManager.instance().addModelListener(z.ResourceTreeModel.ResourceTreeModel,z.ResourceTreeModel.Events.PrimaryPageChanged,this.#g,this)}willHide(){super.willHide(),z.TargetManager.TargetManager.instance().removeModelListener(z.ResourceTreeModel.ResourceTreeModel,z.ResourceTreeModel.Events.PrimaryPageChanged,this.#g,this)}#g(){this.#t=void 0,this.performUpdate()}performUpdate(){this.#c({inputPlaceholder:this.inputPlaceholder,isLoading:this.isLoading,blockedByCrossOrigin:this.blockedByCrossOrigin,isTextInputDisabled:this.isTextInputDisabled,context:this.context,isContextSelected:this.isContextSelected,inspectElementToggled:this.inspectElementToggled,isTextInputEmpty:this.#s(),disclaimerText:this.disclaimerText,conversationType:this.conversationType,multimodalInputEnabled:this.multimodalInputEnabled,imageInput:this.#t,uploadImageInputEnabled:this.uploadImageInputEnabled,isReadOnly:this.isReadOnly,textAreaRef:this.#o,onContextClick:this.onContextClick,onInspectElementClick:this.onInspectElementClick,onImagePaste:this.#i,onNewConversation:this.onNewConversation,onTextInputChange:()=>{this.requestUpdate()},onTakeScreenshot:this.#a.bind(this),onRemoveImageInput:this.#n.bind(this),onSubmit:this.onSubmit,onTextAreaKeyDown:this.onTextAreaKeyDown,onCancel:this.onCancel,onImageUpload:this.onImageUpload,onImageDragOver:this.#m,onImageDrop:this.#e,onContextRemoved:this.onContextRemoved,onContextAdd:this.onContextAdd},void 0,this.contentElement)}focusTextInput(){this.#o.value?.focus()}onSubmit=e=>{if(e.preventDefault(),this.#t?.isLoading)return;let s=!this.#t?.isLoading&&this.#t?.data?{inlineData:{data:this.#t.data,mimeType:this.#t.mimeType}}:void 0;this.onTextSubmit(this.#o.value?.value??"",s,this.#t?.inputType),this.#t=void 0,this.setInputValue("")};onTextAreaKeyDown=e=>{if(!(!e.target||!(e.target instanceof HTMLTextAreaElement))&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing){if(e.preventDefault(),!e.target?.value||this.#t?.isLoading)return;let s=!this.#t?.isLoading&&this.#t?.data?{inlineData:{data:this.#t.data,mimeType:this.#t.mimeType}}:void 0;this.onTextSubmit(e.target.value,s,this.#t?.inputType),this.#t=void 0,this.setInputValue("")}};onCancel=e=>{e.preventDefault(),this.isLoading&&this.onCancelClick()};onImageUpload=e=>{e.stopPropagation(),te.UIUtils.createFileSelectorElement(this.#p.bind(this),".jpeg,.jpg,.png").click()}};var Bs={};J(Bs,{ChatMessage:()=>ze,DEFAULT_VIEW:()=>Ws,renderStep:()=>Ne,titleForStep:()=>Ue});import"./../../ui/components/markdown_view/markdown_view.js";import"./../../ui/kit/kit.js";import*as xe from"./../../core/common/common.js";import"./../../core/host/host.js";import*as gt from"./../../core/i18n/i18n.js";import*as Fs from"./../../core/platform/platform.js";import*as mt from"./../../core/root/root.js";import*as be from"./../../core/sdk/sdk.js";import*as ne from"./../../models/ai_assistance/ai_assistance.js";import*as Us from"./../../models/computed_style/computed_style.js";import*as ge from"./../../models/trace/trace.js";import*as Nt from"./../common/common.js";import*as Ns from"./../../third_party/marked/marked.js";import"./../../ui/components/buttons/buttons.js";import*as Ft from"./../../ui/components/input/input.js";import*as zs from"./../../ui/helpers/helpers.js";import*as zt from"./../../ui/legacy/legacy.js";import*as d from"./../../ui/lit/lit.js";import*as Y from"./../../ui/visual_logging/visual_logging.js";import*as ae from"./../elements/elements.js";import*as pt from"./../timeline/components/components.js";import*as js from"./../timeline/components/insights/insights.js";import*as q from"./../timeline/timeline.js";import*as je from"./../timeline/utils/utils.js";import{PanelUtils as Zi}from"./../utils/utils.js";var Fe=`@scope to (devtools-widget > *){.ai-assistance-feedback-row{font-family:var(--default-font-family);width:100%;display:flex;justify-content:space-between;align-items:center;margin-block:calc(-1 * var(--sys-size-3));margin-top:var(--sys-size-5);&.not-v2{gap:var(--sys-size-8)}.action-buttons{display:flex;align-items:center;gap:var(--sys-size-2);padding:var(--sys-size-4) 0}.vertical-separator{height:16px;width:1px;vertical-align:top;margin:0 var(--sys-size-2);background:var(--sys-color-divider);display:inline-block}.suggestions-container{overflow:hidden;position:relative;display:flex;.suggestions-scroll-container{display:flex;overflow:auto hidden;scrollbar-width:none;gap:var(--sys-size-3);padding:var(--sys-size-3)}.scroll-button-container{position:absolute;top:0;height:100%;display:flex;align-items:center;width:var(--sys-size-15);z-index:999}.scroll-button-container.hidden{display:none}.scroll-button-container.left{left:0;background:linear-gradient(90deg,var(--sys-color-cdt-base-container) 0%,var(--sys-color-cdt-base-container) 50%,transparent)}.scroll-button-container.right{right:0;background:linear-gradient(90deg,transparent,var(--sys-color-cdt-base-container) 50%);justify-content:flex-end}}}.feedback-form{display:flex;flex-direction:column;gap:var(--sys-size-5);margin-top:var(--sys-size-4);background-color:var(--sys-color-surface3);padding:var(--sys-size-6);border-radius:var(--sys-shape-corner-medium-small);max-width:var(--sys-size-32);.feedback-input{height:var(--sys-size-11);padding:0 var(--sys-size-5);background-color:var(--sys-color-surface3);width:auto}.feedback-input::placeholder{color:var(--sys-color-on-surface-subtle);font:var(--sys-typescale-body4-regular)}.feedback-header{display:flex;justify-content:space-between;align-items:center}.feedback-title{margin:0;font:var(--sys-typescale-body3-medium)}.feedback-disclaimer{padding:0 var(--sys-size-4)}}.user-query-wrapper{display:flex;justify-content:flex-end;padding:0 var(--sys-size-5);align-items:center}.chat-message{user-select:text;cursor:initial;display:flex;flex-direction:column;gap:var(--sys-size-5);width:100%;padding:var(--sys-size-7) var(--sys-size-5);font-size:12px;word-break:normal;overflow-wrap:anywhere;border-bottom:var(--sys-size-1) solid var(--sys-color-divider);&.query.ai-v2{width:fit-content;max-width:80%;text-align:left;padding:var(--sys-size-4) var(--sys-size-6);font:var(--sys-typescale-body4-regular);border-radius:var(--sys-shape-corner-medium) var(--sys-shape-corner-extra-small) var(--sys-shape-corner-medium) var(--sys-shape-corner-medium);background-color:var(--sys-color-surface5);color:var(--sys-color-on-surface);&.is-first-message{margin-top:var(--sys-size-6)}}&.ai-v2{border-bottom:none}.ai-css-change{margin:var(--sys-size-6) 0}&:not(.ai-v2) .answer-body-wrapper{display:flex;flex-direction:column;gap:var(--sys-size-5);width:100%}&.ai-v2 .answer-body-wrapper{@container(min-width: 700px){padding-left:35px}}&.is-last-message{border-bottom:0}.message-info{display:flex;align-items:center;height:var(--sys-size-11);gap:var(--sys-size-4);font:var(--sys-typescale-body4-bold);h2{font:var(--sys-typescale-body4-bold)}}.actions{display:flex;flex-direction:column;gap:var(--sys-size-8);max-width:100%}.aborted{color:var(--sys-color-on-surface-subtle)}.image-link{width:fit-content;border-radius:var(--sys-shape-corner-small);outline-offset:var(--sys-size-2);img{max-height:var(--sys-size-20);max-width:100%;border-radius:var(--sys-shape-corner-small);border:1px solid var(--sys-color-neutral-outline);width:fit-content;vertical-align:bottom}}.unavailable-image{margin:var(--sys-size-4) 0;display:inline-flex;justify-content:center;align-items:center;height:var(--sys-size-17);width:var(--sys-size-18);background-color:var(--sys-color-surface3);border-radius:var(--sys-shape-corner-small);border:1px solid var(--sys-color-neutral-outline);devtools-icon{color:var(--sys-color-state-disabled)}}}.indicator{color:var(--sys-color-green-bright)}.summary{display:grid;grid-template-columns:auto 1fr auto;padding:var(--sys-size-3);line-height:var(--sys-size-9);cursor:default;gap:var(--sys-size-3);justify-content:center;align-items:center;.title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font:var(--sys-typescale-body4-regular);.paused{font:var(--sys-typescale-body4-bold)}}}.step-code{display:flex;flex-direction:column;gap:var(--sys-size-2)}.js-code-output{devtools-code-block{--code-block-max-code-height:50px}}.context-details{devtools-code-block{--code-block-max-code-height:80px}}.step{width:fit-content;background-color:var(--sys-color-surface3);border-radius:16px;position:relative;&.empty{pointer-events:none;.arrow{display:none}}&:not(&[open]):hover::after{content:'';height:100%;width:100%;border-radius:inherit;position:absolute;top:0;left:0;pointer-events:none;background-color:var(--sys-color-state-hover-on-subtle)}&.paused{.indicator{color:var(--sys-color-on-surface-subtle)}}&.canceled{.summary{color:var(--sys-color-state-disabled);text-decoration:line-through}.indicator{color:var(--sys-color-state-disabled)}}devtools-markdown-view{--code-background-color:var(--sys-color-surface1)}devtools-icon{vertical-align:bottom}devtools-spinner{width:var(--sys-size-9);height:var(--sys-size-9);padding:var(--sys-size-2)}&[open]{width:auto;.summary .title{white-space:normal;overflow:unset}.summary .arrow{transform:rotate(180deg)}}summary::marker{content:''}summary{border-radius:16px}.step-details{padding:0 var(--sys-size-5) var(--sys-size-4) var(--sys-size-12);display:flex;flex-direction:column;gap:var(--sys-size-6);devtools-code-block{--code-block-background-color:var(--sys-color-surface1)}}}.error-step{color:var(--sys-color-error)}.side-effect-confirmation{display:flex;flex-direction:column;gap:var(--sys-size-5);padding-bottom:var(--sys-size-4)}.side-effect-buttons-container{display:flex;gap:var(--sys-size-4)}.walkthrough-toggle-container{display:flex;gap:var(--sys-size-2);align-items:center;&.has-widgets{gap:var(--sys-size-6)}.chevron{color:var(--sys-color-primary);width:var(--sys-size-8);height:var(--sys-size-8);margin-left:var(--sys-size-2)}}.computed-styles-widget{display:block;width:fit-content}.styling-preview-widget{width:100%;min-height:100px}.main-widgets-wrapper{display:flex;flex-direction:column;gap:var(--sys-size-5)}.step-widgets-wrapper{display:flex;flex-direction:column;align-items:flex-start;gap:var(--sys-size-5)}.widget-header{display:flex;justify-content:space-between;height:var(--sys-size-11);align-items:center;background:var(--sys-color-surface5);padding:var(--sys-size-2) var(--sys-size-4);border-top-left-radius:var(--sys-shape-corner-small);border-top-right-radius:var(--sys-shape-corner-small);.widget-name{font:var(--sys-typescale-body4-regular);max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.widget-reveal-container{padding:0;background:none;border-radius:0}}.widget-reveal-button{display:flex;align-items:center;devtools-icon{margin-left:var(--sys-size-3);color:var(--sys-color-primary);width:var(--sys-size-8);height:var(--sys-size-8)}}.widget-and-revealer-container{width:100%;min-width:var(--sys-size-30);max-width:var(--sys-size-33)}.widget-reveal-container{background:var(--sys-color-surface5);border-bottom-right-radius:var(--sys-shape-corner-small);border-bottom-left-radius:var(--sys-shape-corner-small);padding:0 var(--sys-size-4) var(--sys-size-4) 0}.revealer-only .widget-reveal-container{background:none;border-radius:unset}.widget-content-container{padding:var(--sys-size-4) var(--sys-size-5);border-top-left-radius:var(--sys-shape-corner-medium);border-top-right-radius:var(--sys-shape-corner-medium);overflow-x:auto;background-color:var(--sys-color-surface3);--override-computed-style-property-white-space:normal;.widget-header+&{border-top-left-radius:0;border-top-right-radius:0}.widget-header+&:last-child{border-bottom-left-radius:var(--sys-shape-corner-medium);border-bottom-right-radius:var(--sys-shape-corner-medium)}}.network-request-preview{display:flex;flex-direction:column;gap:var(--sys-size-4);margin-bottom:var(--sys-size-5);padding-bottom:var(--sys-size-5);border-bottom:1px solid var(--sys-color-divider);.network-request-header{display:flex;align-items:center;gap:var(--sys-size-5);.network-request-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background-color:var(--sys-color-surface1);border-radius:var(--sys-shape-corner-small);border:1px solid var(--sys-color-divider);overflow:hidden;img{max-width:100%;max-height:100%;object-fit:contain}devtools-icon{width:20px;height:20px}}.network-request-details{display:flex;flex-direction:column;overflow:hidden;.network-request-name{font:var(--sys-typescale-body4-bold);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.network-request-size{font:var(--sys-typescale-body4-regular);color:var(--sys-color-on-surface-subtle)}}}}}
/*# sourceURL=${import.meta.resolve("././components/chatMessage.css")} */`;var Rs={};J(Rs,{DEFAULT_VIEW:()=>Ms,WalkthroughView:()=>he,walkthroughCloseTitle:()=>ct,walkthroughTitle:()=>lt});import*as rt from"./../../core/i18n/i18n.js";import*as Is from"./../../models/ai_assistance/ai_assistance.js";import"./../../ui/components/buttons/buttons.js";import*as $s from"./../../ui/components/input/input.js";import*as Ls from"./../../ui/legacy/legacy.js";import*as we from"./../../ui/lit/lit.js";var As=`@scope (devtools-widget){.walkthrough-view{height:100%;background-color:var(--sys-color-cdt-base-container);overflow:hidden;display:flex;flex-direction:column}}@scope (devtools-widget > *){.walkthrough-header{display:flex;justify-content:space-between;align-items:center;padding:0 8px;height:35px;border-bottom:1px solid var(--sys-color-divider);flex-shrink:0}.walkthrough-title{font-size:11px;font-weight:500;color:var(--sys-color-on-surface)}.steps-container{flex:1;overflow-y:auto}.steps-scroll-content{padding:var(--sys-size-6);display:flex;flex-direction:column;gap:var(--sys-size-6)}.walkthrough-step{display:flex;gap:var(--sys-size-6);align-items:flex-start;justify-content:flex-start;flex-shrink:0;.step-number{font:var(--sys-typescale-body4-regular);color:var(--sys-color-on-surface-subtle);padding-top:var(--sys-size-4);flex-grow:0;flex-shrink:0}}.step-wrapper{display:flex;flex-direction:column;gap:var(--sys-size-5);min-width:0;width:100%}.step-container{display:flex;gap:var(--sys-size-5);align-items:flex-start}.step-icon{color:var(--sys-color-on-surface-subtle);width:var(--sys-size-8);height:var(--sys-size-8);flex-shrink:0;margin-top:var(--sys-size-2)}.step-content{flex:1;font-size:11px;color:var(--sys-color-on-surface);line-height:1.4}.empty-state{display:flex;align-items:center;justify-content:center;flex:1;color:var(--sys-color-on-surface-subtle);font-size:11px}.inline-wrapper{display:flex;align-items:flex-start;justify-content:flex-start;.inline-icon{display:block;margin-top:var(--sys-size-2)}}.walkthrough-inline{border-radius:var(--sys-size-5);overflow:hidden;width:fit-content;max-width:100%;&[open]{width:auto;background-color:var(--sys-color-surface1);margin-left:calc(var(--sys-size-6) / 2);flex-grow:1;> summary{border-radius:var(--sys-shape-corner-medium-small);border-bottom-right-radius:0;border-bottom-left-radius:0;background:var(--sys-color-surface5);color:var(--sys-color-on-surface);&[data-has-widgets]{margin-left:0}}}}.walkthrough-inline > summary{display:flex;align-items:center;cursor:pointer;background-color:transparent;height:var(--sys-size-11);font:var(--sys-typescale-body4-regular);font-weight:var(--ref-typeface-weight-medium);user-select:none;list-style:none;justify-content:flex-start;gap:var(--sys-size-4);color:var(--sys-color-primary);padding:0 var(--sys-size-6);overflow:hidden;devtools-icon{color:var(--sys-color-primary)}&[data-has-widgets]{background:var(--sys-color-tonal-container);color:var(--sys-color-on-tonal-container);border-radius:var(--sys-shape-corner-full);margin-left:var(--sys-size-6);devtools-icon{color:var(--sys-color-on-tonal-container)}}> .walkthrough-inline-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}}.walkthrough-inline > summary::-webkit-details-marker{display:none}.walkthrough-inline > summary:hover{background-color:var(--sys-color-state-hover-on-subtle)}.walkthrough-inline .steps-container{padding:var(--sys-size-6);border-top:1px solid var(--sys-color-divider);background-color:transparent}.walkthrough-inline > summary > devtools-icon[name='chevron-right']{width:var(--sys-size-8);height:var(--sys-size-8);transition:transform 0.2s;margin-left:auto}.walkthrough-inline .step{background-color:var(--sys-color-surface5)}.walkthrough-inline[open] > summary > devtools-icon[name='chevron-right']{transform:rotate(270deg)}}
/*# sourceURL=${import.meta.resolve("././components/walkthroughView.css")} */`;var at=rt.i18n.lockedString,{html:ie,render:Ki,Directives:Yi}=we,{ref:Ss}=Yi,Ts=2,oe={close:"Close",title:"Agent walkthrough",showThinking:"Show thinking",showAgentWalkthrough:"Show agent walkthrough",hideThinking:"Hide thinking",hideAgentWalkthrough:"Hide agent walkthrough"},Qi=rt.i18n.registerUIStrings("panels/ai_assistance/components/WalkthroughView.ts",oe),Dt=rt.i18n.getLocalizedString.bind(void 0,Qi);function lt(t){return t.isLoading?Ue(t.lastStep):t.hasWidgets?at(oe.showAgentWalkthrough):at(oe.showThinking)}function ct(t){return t.isInlined?Dt(oe.title):t.hasWidgets?at(oe.hideAgentWalkthrough):at(oe.hideThinking)}function Ji(t,e,s){let i=s.at(-1);if(!t.isInlined||!i)return we.nothing;function o(c){let a=c.target.open;t.message&&(a?t.onOpen(t.message):t.onToggle(a,t.message))}let n=s.some(c=>c.widgets?.length),r=Is.AiUtils.getIconName();return ie`
    <div class="inline-wrapper" ?data-open=${t.isExpanded}>
      <span class="inline-icon">
        ${t.isLoading?ie`<devtools-spinner></devtools-spinner>`:ie`<devtools-icon name=${r}></devtools-icon>`}
      </span>
      <details class="walkthrough-inline" ?open=${t.isExpanded} @toggle=${o}>
        <summary ?data-has-widgets=${!t.isLoading&&n}>
          <span class="walkthrough-inline-title">
            ${t.isExpanded?ct({hasWidgets:n,isInlined:!0}):lt({isLoading:t.isLoading,lastStep:i,hasWidgets:n})}
          </span>
          <devtools-icon name="chevron-right"></devtools-icon>
        </summary>

        ${e}
      </details>
    </div>
  `}function Xi(t,e,s){return t.isInlined?we.nothing:ie`
    <div class="walkthrough-view">
      <div class="walkthrough-header">
         <div class="walkthrough-title">${Dt(oe.title)}</div>
         <devtools-button
          .data=${{variant:"toolbar",iconName:"cross",title:Dt(oe.close),jslogContext:"close-walkthrough"}}
          @click=${()=>{t.message&&t.onToggle(!1,t.message)}}
        ></devtools-button>
      </div>
      ${e}
      ${s===0?ie`
        <div class="empty-state">
          <p>No walkthrough steps available yet.</p>
        </div>
      `:we.nothing}
    </div>
  `}var Ms=(t,e,s)=>{let i=t.message?.parts.filter(r=>r.type==="step")?.map(r=>r.step)??[],o=i.filter(r=>!r.requestApproval),n=o.length>0?ie`
    <div class="steps-container" @scroll=${t.handleScroll} ${Ss(r=>{e.scrollContainer=r})}>
      <div class="steps-scroll-content" ${Ss(r=>{e.stepsContainer=r})}>
        ${o.map((r,c)=>ie`
          <div class="walkthrough-step">
            <span class="step-number">${c+1}</span>
            <div class="step-wrapper">
              ${Ne({step:r,isLoading:t.isLoading,markdownRenderer:t.markdownRenderer,isLast:c===o.length-1})}
            </div>
          </div>
        `)}
      </div>
    </div>
  `:we.nothing;Ki(ie`
    <style>
      ${$s.textInputStyles}
      ${Fe}
      ${As}
    </style>
    ${t.isInlined?Ji(t,n,i):Xi(t,n,o.length)}`,s)},he=class extends Ls.Widget.Widget{#o;#t=null;#s=!1;#a=null;#n=()=>{};#r=()=>{};#i=!1;#m=!1;#e=!0;#p=!1;#c={};#g=new ResizeObserver(()=>this.#u());#h=0;constructor(e,s=Ms){super(e),this.#o=s}wasShown(){super.wasShown(),this.#d()}willHide(){super.willHide(),this.#g.disconnect()}#d(){this.#c.stepsContainer&&this.#g.observe(this.#c.stepsContainer)}#u(){let e=this.#c.stepsContainer?.offsetWidth??0;if(e!==this.#h){this.#h=e;return}!this.#e||!this.#s||this.scrollToBottom()}scrollToBottom(){this.#c.stepsContainer&&(this.#p=!0,window.requestAnimationFrame(()=>{let e=this.#c.stepsContainer?.lastElementChild;e&&e.scrollIntoView({behavior:"smooth",block:"end"})}))}#f=e=>{if(!(!e.target||!(e.target instanceof HTMLElement))){if(this.#p){e.target.scrollTop+e.target.clientHeight+Ts>=e.target.scrollHeight&&(this.#p=!1);return}this.#e=e.target.scrollTop+e.target.clientHeight+Ts>=e.target.scrollHeight}};set isLoading(e){this.#s=e,this.requestUpdate()}get isLoading(){return this.#s}get markdownRenderer(){return this.#a}set markdownRenderer(e){this.#a=e,this.requestUpdate()}get message(){return this.#t}get onOpen(){return this.#r}set onOpen(e){this.#r=e,this.requestUpdate()}set message(e){this.#t=e,this.requestUpdate()}set onToggle(e){this.#n=e,this.requestUpdate()}set isInlined(e){this.#i=e,this.requestUpdate()}set isExpanded(e){this.#m=e,this.requestUpdate()}performUpdate(){this.#a&&(this.#o({isLoading:this.#s,markdownRenderer:this.#a,onToggle:this.#n,onOpen:this.#r,isInlined:this.#i,isExpanded:this.#m,message:this.#t,handleScroll:this.#f},this.#c,this.contentElement),this.#d(),this.#e&&this.#s&&this.scrollToBottom())}};var{html:l,Directives:{ref:dt,ifDefined:Es}}=d,p=gt.i18n.lockedString,{widget:j}=zt.Widget,eo="https://crbug.com/364805393",Ps=1,ht=11,m={thumbsUp:"Good response",thumbsDown:"Bad response",provideFeedbackPlaceholder:"Provide additional feedback",disclaimer:"Submitted feedback will also include your conversation",submit:"Submit",whyThisRating:"Why did you choose this rating? (optional)",close:"Close",report:"Report legal issue",scrollToNext:"Scroll to next suggestions",scrollToPrevious:"Scroll to previous suggestions",copyResponse:"Copy response",systemError:"Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.",maxStepsError:"Seems like I am stuck with the investigation. It would be better if you start over.",crossOriginError:"I have selected the new context but you will have to start a new chat.",stoppedResponse:"You stopped this response",confirmActionRequestApproval:"Continue",declineActionRequestApproval:"Cancel",ai:"AI",gemini:"Gemini",investigating:"Investigating",paused:"Paused",codeExecuted:"Code executed",codeToExecute:"Code to execute",dataReturned:"Data returned",completed:"Completed",canceled:"Canceled",imageInputSentToTheModel:"Image input sent to the model",openImageInNewTab:"Open image in a new tab",imageUnavailable:"Image unavailable",reveal:"Reveal",revealTrace:"Reveal trace",coreVitals:"Core Web Vitals",lcpBreakdown:"LCP breakdown",lcpElement:"LCP element",performanceSummary:"Performance summary",exportForAgents:"Copy for your coding agent",bottomUpTree:"Bottom-up thread activity"},Ws=(t,e,s)=>{let i=!!mt.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled,o=t.message;if(o.entity==="user"){let a=o.imageInput&&"inlineData"in o.imageInput?wo(o.imageInput.inlineData):d.nothing,f=d.Directives.classMap({"chat-message":!0,query:!0,"is-last-message":t.isLastMessage,"is-first-message":t.isFirstMessage,"ai-v2":i}),x=d.Directives.classMap({"user-query-wrapper":i});d.render(l`
      <style>${Ft.textInputStyles}</style>
      <style>${Fe}</style>
      <div class=${x}>
        <section class=${f} jslog=${Y.section("question")}>
          ${a}
          <div class="message-content">${Ut(o.text,t.markdownRenderer)}</div>
        </section>
      </div>
    `,s);return}let n=o.parts.filter(a=>a.type==="step").map(a=>a.step),r=ne.AiUtils.getIconName(),c=d.Directives.classMap({"chat-message":!0,answer:!0,"is-last-message":t.isLastMessage,"is-first-message":t.isFirstMessage,"ai-v2":i});d.render(l`
    <style>${Ft.textInputStyles}</style>
    <style>${Fe}</style>
    <section class=${c} jslog=${Y.section("answer")}>
      ${i?d.nothing:l`
        <div class="message-info">
          <devtools-icon name=${r}></devtools-icon>
          <div class="message-name">
            <h2>${ne.AiUtils.isGeminiBranding()?p(m.gemini):p(m.ai)}</h2>
          </div>
        </div>`}
      ${i?no(t,n):d.nothing}
      <div class="answer-body-wrapper">
        ${d.Directives.repeat(o.parts,(a,f)=>f,(a,f)=>{let x=f===o.parts.length-1;return a.type==="answer"?l`<p>${Ut(a.text,t.markdownRenderer,{animate:!t.isReadOnly&&t.isLoading&&x&&t.isLastMessage})}</p>`:a.type==="widget"?l`${d.Directives.until(Vs(a.widgets,{wrapperClass:"main-widgets-wrapper"}))}`:!i&&a.type==="step"?Ne({step:a.step,isLoading:t.isLoading,markdownRenderer:t.markdownRenderer,isLast:x}):d.nothing})}
        ${yo(o)}
        ${t.isLastMessage&&i&&!t.isLoading&&t.changeSummary?l`
          <devtools-code-block
            .code=${t.changeSummary}
            .codeLang=${"css"}
            .displayLimit=${ht}
            .displayNotice=${!0}
            class="ai-css-change"
          ></devtools-code-block>
        `:d.nothing}
        ${t.showActions?bo(t,e):d.nothing}
      </div>
    </section>
  `,s)};function Ut(t,e,{animate:s,ref:i}={}){let o=[];try{o=Ns.Marked.lexer(t);for(let n of o)e.renderToken(n)}catch{return l`${t}`}return l`<devtools-markdown-view
    .data=${{tokens:o,renderer:e,animationEnabled:s}}
    ${i?dt(i):d.nothing}>
  </devtools-markdown-view>`}function Ue(t){return t.title??`${p(m.investigating)}\u2026`}function to(t){let e=t.requestApproval?l`<span class="paused">${p(m.paused)}: </span>`:d.nothing;return l`<span class="title">${e}${Ue(t)}</span>`}function so(t){if(!t.code&&!t.output)return d.nothing;let e=t.output&&!t.canceled?p(m.codeExecuted):p(m.codeToExecute),s=t.code?l`<div class="action-result">
      <devtools-code-block
        .code=${t.code.trim()}
        .codeLang=${"js"}
        .displayLimit=${ht}
        .displayNotice=${!t.output}
        .header=${e}
        .showCopyButton=${!0}
      ></devtools-code-block>
  </div>`:d.nothing,i=t.output?l`<div class="js-code-output">
    <devtools-code-block
      .code=${t.output}
      .codeLang=${"js"}
      .displayLimit=${ht}
      .displayNotice=${!0}
      .header=${p(m.dataReturned)}
      .showCopyButton=${!1}
    ></devtools-code-block>
  </div>`:d.nothing;return l`<div class="step-code">${s}${i}</div>`}function io({step:t,markdownRenderer:e,isLast:s}){let i=s&&t.requestApproval?vo(t):d.nothing,o=t.thought?l`<p>${Ut(t.thought,e)}</p>`:d.nothing,n=t.contextDetails?l`${d.Directives.repeat(t.contextDetails,r=>l`<div class="context-details">
      <devtools-code-block
        .code=${r.text}
        .codeLang=${r.codeLang||""}
        .displayLimit=${ht}
        .displayNotice=${!1}
        .header=${r.title}
        .showCopyButton=${!0}
      ></devtools-code-block>
    </div>`)}`:d.nothing;return l`<div class="step-details">
    ${o}
    ${so(t)}
    ${i}
    ${n}
  </div>`}function oo(t,e){let{message:s,walkthrough:i}=t,o=e.at(-1);if(i.isInlined||!o)return d.nothing;let n=e.some(x=>x.widgets?.length),r=i.isExpanded&&t.message===t.walkthrough.activeSidebarMessage,c=r?ct({hasWidgets:n}):lt({isLoading:t.isLoading,hasWidgets:n,lastStep:o}),a=n&&!t.isLoading?"tonal":"text",f=ne.AiUtils.getIconName();return l`
    <div class="walkthrough-toggle-container ${n?"has-widgets":""}">
      ${t.isLoading?l`<devtools-spinner></devtools-spinner>`:l`<devtools-icon name=${f}></devtools-icon>`}
      <devtools-button
        .variant=${a}
        .size=${"SMALL"}
        .title=${o.isLoading?Ue(o):c}
        .jslogContext=${i.isExpanded?"ai-hide-walkthrough-sidebar":"ai-show-walkthrough-sidebar"}
        data-show-walkthrough
        @click=${()=>{i.activeSidebarMessage===t.message&&i.isExpanded?i.onToggle(!1,s):i.onOpen(s)}}
>
        ${c}<devtools-icon class="chevron" .name=${r?"cross":"chevron-right"}></devtools-icon>
      </devtools-button>
    </div>
  `}function no(t,e){if(!e.at(-1))return d.nothing;let i=e.filter(a=>a.requestApproval),o=t.walkthrough.isInlined?d.nothing:oo(t,e),n=t.walkthrough.isInlined?t.walkthrough.inlineExpandedMessages.includes(t.message):t.walkthrough.isExpanded&&t.walkthrough.activeSidebarMessage===t.message,r=i.length>0?i.map(a=>l`
    <div class="side-effect-container">
      ${Ne({step:a,isLoading:t.isLoading,markdownRenderer:t.markdownRenderer,isLast:!0})}
    </div> `):d.nothing,c=t.walkthrough.isInlined?l`
    <div class="walkthrough-container">
      ${j(he,{message:t.message,isLoading:t.isLoading&&t.isLastMessage,markdownRenderer:t.markdownRenderer,isInlined:!0,isExpanded:n,onToggle:t.walkthrough.onToggle,onOpen:t.walkthrough.onOpen})}
    </div>
  `:d.nothing;return l`
    ${o}
    ${c}
    ${r}
  `}function ao({step:t,isLoading:e,isLast:s}){if(e&&s&&!t.requestApproval)return l`<devtools-spinner></devtools-spinner>`;let i="checkmark",o=p(m.completed),n="button";return s&&t.requestApproval?(n=void 0,o=void 0,i="pause-circle"):t.canceled&&(o=p(m.canceled),i="cross"),l`<devtools-icon
      class="indicator"
      role=${Es(n)}
      aria-label=${Es(o)}
      .name=${i}
    ></devtools-icon>`}function Ne({step:t,isLoading:e,markdownRenderer:s,isLast:i}){let o=d.Directives.classMap({step:!0,empty:!t.thought&&!t.code&&!t.contextDetails&&!t.requestApproval,paused:!!t.requestApproval,canceled:!!t.canceled});return l`
    <details class=${o}
      jslog=${Y.section("step")}
      .open=${!!t.requestApproval}>
      <summary>
        <div class="summary">
          ${ao({step:t,isLoading:e,isLast:i})}
          ${to(t)}
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        </div>
      </summary>
      ${io({step:t,markdownRenderer:s,isLast:i})}
    </details>
    ${d.Directives.until(Vs(t.widgets,{wrapperClass:"step-widgets-wrapper"}))}
    `}var Ds=new Map;async function Os(t){let e=Ds.get(t);if(e)return e;let s=be.TargetManager.TargetManager.instance().primaryPageTarget();if(!s)return null;let o=await new be.DOMModel.DeferredDOMNode(s,t).resolvePromise();return o&&Ds.set(t,o),o}async function ro(t){let e=await Os(t.data.backendNodeId);if(!e)return null;let s=new Us.ComputedStyleModel.ComputedStyle(e,t.data.computedStyles);return{renderedWidget:l`<devtools-widget
      class="computed-styles-widget" ${j(ae.ComputedStyleWidget.ComputedStyleWidget,{nodeStyle:s,matchedStyles:t.data.matchedCascade,propertyTraces:null,allowUserControl:!1,filterText:new RegExp(t.data.properties.join("|"),"i"),enableNarrowViewResizing:!1})}></devtools-widget>`,revealable:new ae.ElementsPanel.NodeComputedStyles(e),title:l`<devtools-widget
      ${j(Nt.DOMLinkifier.DOMNodeLink,{node:e})}
    ></devtools-widget>`}}async function lo(t){return{renderedWidget:l`<devtools-widget class="core-vitals-widget" ${j(pt.CWVMetrics.CWVMetrics,{data:t.data,skipBottomBorder:!0})}>
  </devtools-widget>`,revealable:new je.Helpers.RevealableCoreVitals(t.data.insightSetKey),title:p(m.coreVitals)}}async function co(t){let e=await Os(t.data.backendNodeId);return e?{renderedWidget:l`<devtools-widget
      class="styling-preview-widget"
      ${j(ae.StandaloneStylesContainer.StandaloneStylesContainer,{domNode:e,filter:t.data.selector?new RegExp(t.data.selector):null})}>
  </devtools-widget>`,revealable:e,title:l`<devtools-widget
      ${j(Nt.DOMLinkifier.DOMNodeLink,{node:e})}
    ></devtools-widget>`}:null}async function ho(t){let e=t.data.lcpData;return e?{renderedWidget:l`<devtools-widget
    class="lcp-breakdown-widget"
    ${j(js.LCPBreakdown.LCPBreakdown,{model:e,minimal:!0})}></devtools-widget>`,revealable:new je.Helpers.RevealableInsight(e),title:p(m.lcpBreakdown)}:null}async function go(t){let e=ne.AIQueries.AIQueries.mainThreadActivityBottomUp(t.data.bounds,t.data.parsedTrace);if(!e)return null;let s=e.events,i=ge.Helpers.Timing.microToMilli(t.data.bounds.min),o=ge.Helpers.Timing.microToMilli(t.data.bounds.max);return{renderedWidget:l`<devtools-widget
      class="bottom-up-timeline-tree-widget"
      ${j(q.TimelineTreeView.BottomUpTimelineTreeView,{selectedEvents:s,parsedTrace:t.data.parsedTrace,startTime:i,endTime:o,compactMode:!0,maxLinkLength:15,maxRows:10})}></devtools-widget>`,revealable:new je.Helpers.RevealableBottomUpProfile(t.data.bounds),title:p(m.bottomUpTree)}}function mo(t){if(t===null)return d.nothing;function e(){t!==null&&xe.Revealer.reveal(t?.revealable)}let s=d.Directives.classMap({"widget-and-revealer-container":!0,"revealer-only":t.renderedWidget===null}),i=l`
    <devtools-button class="widget-reveal-button"
      .variant=${"text"}
      @click=${e}
    >
      ${t.customRevealTitle??p(m.reveal)}
      <devtools-icon name='tab-move'></devtools-icon>
    </devtools-button>
  `;return l`
    <div class=${s}>
      ${t.title?l`
        <div class="widget-header">
          <div class="widget-name">${t.title}</div>
          <div class="widget-reveal-container">
            ${i}
          </div>
        </div>
      `:d.nothing}
      ${t.renderedWidget?l`
        <div class="widget-content-container">
          ${t.renderedWidget}
        </div>`:d.nothing}
      ${t.title?d.nothing:l`
        <div class="widget-reveal-container">
          ${i}
        </div>
      `}
    </div>
    `}async function po(t){return{renderedWidget:null,title:null,revealable:new q.TimelinePanel.ParsedTraceRevealable(t.data.parsedTrace),customRevealTitle:p(m.revealTrace)}}function uo(t){let e=t.url.split("/").pop()||t.url,s=gt.ByteUtilities.bytesToString(t.size),i=xe.ResourceType.resourceTypes[t.resourceType],{iconName:o,color:n}=Zi.iconDataForResourceType(i);return l`
    <div class="network-request-preview">
      <div class="network-request-header">
        <div class="network-request-icon">
          ${i.isImage()?l`<img src=${t.imageUrl??t.url} alt=${e} />`:l`<devtools-icon name=${o} style=${d.Directives.styleMap({color:n??""})}></devtools-icon>`}
        </div>
        <div class="network-request-details">
          <div class="network-request-name" title=${t.url}>${e}</div>
          <div class="network-request-size">${s}</div>
        </div>
      </div>
    </div>
  `}async function fo(t){let e=t.data.root;if(!(e instanceof be.DOMModel.DOMNodeSnapshot))return null;let s=t.data.networkRequest;return{renderedWidget:l`
    ${s?uo(s):d.nothing}
    <devtools-widget class="dom-tree-widget" ${j(ae.ElementsTreeOutline.DOMTreeWidget,{maxTreeDepth:2,enableContextMenu:!1,showComments:!1,showAIButton:!1,disableEdits:!0,expandRoot:!0,rootDOMNode:e,visibleWidth:400,wrap:!0,maxRows:10})}></devtools-widget>
  `,revealable:new be.DOMModel.DeferredDOMNode(e.domModel().target(),e.backendNodeId()),title:p(m.lcpElement)}}async function Vs(t,e={}){if(!mt.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled||!t||t.length===0)return d.nothing;let s=await Promise.all(t.map(async i=>{let o=null;switch(i.name){case"COMPUTED_STYLES":o=await ro(i);break;case"CORE_VITALS":o=await lo(i);break;case"STYLE_PROPERTIES":o=await co(i);break;case"DOM_TREE":o=await fo(i);break;case"PERFORMANCE_TRACE":o=await po(i);break;case"LCP_BREAKDOWN":o=await ho(i);break;case"TIMELINE_RANGE_SUMMARY":o=await xo(i);break;case"BOTTOM_UP_TREE":o=await go(i);break;default:Fs.assertNever(i,"Unknown AiWidget name")}return mo(o)}));return e.wrapperClass?l`<div class=${e.wrapperClass}>${s}</div>`:l`${s}`}function vo(t){return t.requestApproval?l`<div
    class="side-effect-confirmation"
    jslog=${Y.section("side-effect-confirmation")}
  >
    ${t.requestApproval.description?l`<p>${t.requestApproval.description}</p>`:d.nothing}
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${{variant:"outlined",jslogContext:"decline-execute-code"}}
        @click=${()=>t.requestApproval?.onAnswer(!1)}
      >${p(m.declineActionRequestApproval)}</devtools-button>
      <devtools-button
        .data=${{variant:"primary",jslogContext:"accept-execute-code",iconName:"play"}}
        @click=${()=>t.requestApproval?.onAnswer(!0)}
      >${p(m.confirmActionRequestApproval)}</devtools-button>
    </div>
  </div>`:d.nothing}function yo(t){if(t.error){let e;switch(t.error){case"unknown":case"block":e=m.systemError;break;case"max-steps":e=m.maxStepsError;break;case"cross-origin":e=m.crossOriginError;break;case"abort":return l`<p class="aborted" jslog=${Y.section("aborted")}>${p(m.stoppedResponse)}</p>`}return l`<p class="error" jslog=${Y.section("error")}>${p(e)}</p>`}return d.nothing}function wo(t){if(t.data===ne.AiConversation.NOT_FOUND_IMAGE_DATA)return l`<div class="unavailable-image" title=${m.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;let e=`data:${t.mimeType};base64,${t.data}`;return l`<devtools-link
      class="image-link" title=${m.openImageInNewTab}
      href=${e}
    >
      <img src=${e} alt=${m.imageInputSentToTheModel} />
    </devtools-link>`}function bo(t,e){let s=mt.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled,i=d.Directives.classMap({"ai-assistance-feedback-row":!0,"not-v2":!s});return l`
    <div class=${i}>
      <div class="action-buttons">
        ${t.showRateButtons?l`
          <devtools-button
            .data=${{variant:"icon",size:"SMALL",iconName:"thumb-up",toggledIconName:"thumb-up-filled",toggled:t.currentRating==="POSITIVE",toggleType:"primary-toggle",title:p(m.thumbsUp),jslogContext:"thumbs-up"}}
            @click=${()=>t.onRatingClick("POSITIVE")}
          ></devtools-button>
          <devtools-button
            .data=${{variant:"icon",size:"SMALL",iconName:"thumb-down",toggledIconName:"thumb-down-filled",toggled:t.currentRating==="NEGATIVE",toggleType:"primary-toggle",title:p(m.thumbsDown),jslogContext:"thumbs-down"}}
            @click=${()=>t.onRatingClick("NEGATIVE")}
          ></devtools-button>
          ${s?d.nothing:l`<div class="vertical-separator"></div>`}
        `:d.nothing}
        <devtools-button
          .data=${{variant:"icon",size:"SMALL",title:p(m.report),iconName:"report",jslogContext:"report"}}
          @click=${t.onReportClick}
        ></devtools-button>
        ${s?d.nothing:l`
          <div class="vertical-separator"></div>
          <devtools-button
            .data=${{variant:"icon",size:"SMALL",title:p(m.copyResponse),iconName:"copy",jslogContext:"copy-ai-response"}}
            aria-label=${p(m.copyResponse)}
            @click=${t.onCopyResponseClick}></devtools-button>
        `}
        ${t.onExportClick&&s&&t.isLastMessage?l`
          <devtools-button
            class="export-for-agents-button"
            .jslogContext=${"ai-export-for-agents"}
            .variant=${"outlined"}
            .iconName=${"copy"}
            @click=${t.onExportClick}
          >${p(m.exportForAgents)}</devtools-button>
          ${t.suggestions?l`<div class="vertical-separator"></div>`:d.nothing}
        `:d.nothing}
      </div>
      ${t.suggestions?l`<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${dt(o=>{e.suggestionsLeftScrollButtonContainer=o})}>
          <devtools-button
            class='scroll-button'
            .data=${{variant:"icon",size:"SMALL",iconName:"chevron-left",title:p(m.scrollToPrevious),jslogContext:"chevron-left"}}
            @click=${()=>t.scrollSuggestionsScrollContainer("left")}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${t.onSuggestionsScrollOrResize} ${dt(o=>{e.suggestionsScrollContainer=o})}>
          ${t.suggestions.map(o=>l`<devtools-button
            class='suggestion'
            .data=${{variant:"outlined",title:o,jslogContext:"suggestion"}}
            @click=${()=>t.onSuggestionClick(o)}
          >${o}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${dt(o=>{e.suggestionsRightScrollButtonContainer=o})}>
          <devtools-button
            class='scroll-button'
            .data=${{variant:"icon",size:"SMALL",iconName:"chevron-right",title:p(m.scrollToNext),jslogContext:"chevron-right"}}
            @click=${()=>t.scrollSuggestionsScrollContainer("right")}
          ></devtools-button>
        </div>
      </div>`:d.nothing}
    </div>
    ${t.isShowingFeedbackForm?l`
      <form class="feedback-form" @submit=${t.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${p(m.whyThisRating)}</h4>
          <devtools-button
            aria-label=${p(m.close)}
            @click=${t.onClose}
            .data=${{variant:"icon",iconName:"cross",size:"SMALL",title:p(m.close),jslogContext:"close"}}
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${o=>t.onInputChange(o.target.value)}
          placeholder=${p(m.provideFeedbackPlaceholder)}
          jslog=${Y.textField("feedback").track({keydown:"Enter"})}
        >
        <span class="feedback-disclaimer">${p(m.disclaimer)}</span>
        <div>
          <devtools-button
          aria-label=${p(m.submit)}
          .data=${{type:"submit",disabled:t.isSubmitButtonDisabled,variant:"outlined",size:"SMALL",title:p(m.submit),jslogContext:"send"}}
          >${p(m.submit)}</devtools-button>
        </div>
      </div>
    </form>
    `:d.nothing}
  `}var ze=class extends zt.Widget.Widget{message={entity:"user",text:""};isLoading=!1;isReadOnly=!1;canShowFeedbackForm=!1;isLastMessage=!1;isFirstMessage=!1;markdownRenderer;onSuggestionClick=()=>{};onFeedbackSubmit=()=>{};onCopyResponseClick=()=>{};onExportClick=()=>{};changeSummary;walkthrough={onOpen:()=>{},onToggle:()=>{},isInlined:!1,isExpanded:!1,activeSidebarMessage:null,inlineExpandedMessages:[]};#o=new ResizeObserver(()=>this.#g());#t=new xe.Throttler.Throttler(100);#s="";#a;#n=!1;#r=!0;#i;#m={};#e=!1;constructor(e,s){super(e),this.#i=s??Ws}wasShown(){super.wasShown(),this.performUpdate(),this.#c()}performUpdate(){this.#i({message:this.message,isLoading:this.isLoading,isReadOnly:this.isReadOnly,canShowFeedbackForm:this.canShowFeedbackForm,markdownRenderer:this.markdownRenderer,isLastMessage:this.isLastMessage,isFirstMessage:this.isFirstMessage,onSuggestionClick:this.onSuggestionClick,onRatingClick:this.#d.bind(this),onReportClick:()=>zs.openInNewTab(eo),onCopyResponseClick:()=>{this.message.entity==="model"&&this.onCopyResponseClick(this.message)},onExportClick:this.onExportClick,scrollSuggestionsScrollContainer:this.#h.bind(this),onSuggestionsScrollOrResize:this.#g.bind(this),onSubmit:this.#f.bind(this),onClose:this.#u.bind(this),onInputChange:this.#p.bind(this),isSubmitButtonDisabled:this.#r,showActions:!(this.isLastMessage&&this.isLoading),showRateButtons:this.message.entity==="model"&&!!this.message.rpcId,suggestions:this.isLastMessage&&this.message.entity==="model"&&!this.isReadOnly&&this.message.parts.at(-1)?.type==="answer"?this.message.parts.at(-1).suggestions:void 0,currentRating:this.#a,isShowingFeedbackForm:this.#n,onFeedbackSubmit:this.onFeedbackSubmit,changeSummary:this.changeSummary,walkthrough:this.walkthrough},this.#m,this.contentElement),this.#m.suggestionsScrollContainer&&!this.#e&&(this.#o.observe(this.#m.suggestionsScrollContainer),this.#e=!0)}#p(e){this.#s=e;let s=!e;s!==this.#r&&(this.#r=s,this.performUpdate())}#c=()=>{let e=this.#m.suggestionsScrollContainer,s=this.#m.suggestionsLeftScrollButtonContainer,i=this.#m.suggestionsRightScrollButtonContainer;if(!e||!s||!i)return;let o=e.scrollLeft>Ps,n=e.scrollLeft+e.offsetWidth+Ps<e.scrollWidth;s.classList.toggle("hidden",!o),i.classList.toggle("hidden",!n)};willHide(){super.willHide(),this.#o.disconnect(),this.#e=!1}#g(){this.#t.schedule(()=>(this.#c(),Promise.resolve()))}#h(e){let s=this.#m.suggestionsScrollContainer;s&&s.scroll({top:0,left:e==="left"?s.scrollLeft-s.clientWidth:s.scrollLeft+s.clientWidth,behavior:"smooth"})}#d(e){if(this.#a===e){this.#a=void 0,this.#n=!1,this.#r=!0,this.message.entity==="model"&&this.message.rpcId&&this.onFeedbackSubmit(this.message.rpcId,"SENTIMENT_UNSPECIFIED"),this.performUpdate();return}this.#a=e,this.#n=this.canShowFeedbackForm,this.message.entity==="model"&&this.message.rpcId&&this.onFeedbackSubmit(this.message.rpcId,e),this.performUpdate()}#u(){this.#n=!1,this.#r=!0,this.performUpdate()}#f(e){e.preventDefault();let s=this.#s;!this.#a||!s||(this.message.entity==="model"&&this.message.rpcId&&this.onFeedbackSubmit(this.message.rpcId,this.#a,s),this.#n=!1,this.#r=!0,this.performUpdate())}};async function xo(t){let{bounds:e,parsedTrace:s,track:i}=t.data,o=[];if(i==="main"){let x=q.TimelinePanel.TimelinePanel.instance().getFlameChart().getMainDataProvider(),U=x.timelineData().groups.find($e=>$e.name.startsWith("Main \u2014 "));U&&(o=x.groupTreeEvents(U)??[])}let n=Array.from(o);n.sort((f,x)=>f.ts-x.ts);let r=new q.ThirdPartyTreeView.ThirdPartyTreeViewWidget,c=new ge.EntityMapper.EntityMapper(s);return r.model={selectedEvents:n,parsedTrace:s,entityMapper:c},r.activeSelection=q.TimelineSelection.selectionFromRangeMicroSeconds(e.min,e.max),r.refreshTree(!0),{renderedWidget:l`
    <devtools-widget
      ${j(pt.TimelineRangeSummaryView.TimelineRangeSummaryView,{data:{parsedTrace:s,events:o,startTime:ge.Helpers.Timing.microToMilli(e.min),endTime:ge.Helpers.Timing.microToMilli(e.max),thirdPartyTreeTemplate:l`${j(q.ThirdPartyTreeView.ThirdPartyTreeViewWidget,{maxRows:10,model:{selectedEvents:r.selectedEvents??null,parsedTrace:s,entityMapper:r.entityMapper()},activeSelection:{bounds:e}})}`}})}
    ></devtools-widget>`,revealable:new je.Helpers.RevealableTimeRange(e),title:p(m.performanceSummary)}}var qs=`*{box-sizing:border-box;margin:0;padding:0}:host{width:100%;height:100%;user-select:text;display:flex;flex-direction:column;background-color:var(--sys-color-cdt-base-container)}.chat-ui{width:100%;height:100%;max-height:100%;display:flex;flex-direction:column;container-type:size;container-name:--chat-ui-container}.info-tooltip-container{max-width:var(--sys-size-28);padding:var(--sys-size-4) var(--sys-size-5)}.tooltip-link{display:block;margin-top:var(--sys-size-4);color:var(--sys-color-primary);padding-left:0}.chat-cancel-context-button{padding-bottom:3px;padding-right:var(--sys-size-3)}.messages-container{flex-grow:1;width:100%;max-width:var(--sys-size-36);@container (width > 688px){--half-scrollbar-width:calc((100cqw - 100%) / 2);margin-left:var(--half-scrollbar-width);margin-right:calc(-1 * var(--half-scrollbar-width))}}.link{color:var(--text-link);text-decoration:underline;cursor:pointer}button.link{border:none;background:none;font:inherit;&:focus-visible{outline:var(--sys-size-2) solid var(--sys-color-state-focus-ring);outline-offset:0;border-radius:var(--sys-shape-corner-extra-small)}}.select-an-element-text{margin-left:2px}main{overflow:hidden auto;display:flex;flex-direction:column;align-items:center;height:100%;container-type:size;scrollbar-width:thin;transform:translateZ(1px);scroll-timeline:--scroll-timeline y}.empty-state-container{flex-grow:1;display:grid;align-items:center;justify-content:center;font:var(--sys-typescale-headline4);gap:var(--sys-size-8);padding:var(--sys-size-4);max-width:var(--sys-size-33);@container (width > 688px){--half-scrollbar-width:calc((100cqw - 100%) / 2);margin-left:var(--half-scrollbar-width);margin-right:calc(-1 * var(--half-scrollbar-width))}.header{display:flex;flex-direction:column;width:100%;align-items:center;justify-content:center;align-self:end;gap:var(--sys-size-5);.icon{display:flex;justify-content:center;align-items:center;height:var(--sys-size-14);width:var(--sys-size-14);border-radius:var(--sys-shape-corner-small);background:linear-gradient(135deg,var(--sys-color-gradient-primary),var(--sys-color-gradient-tertiary))}h1{font:var(--sys-typescale-headline4)}p{text-align:center;font:var(--sys-typescale-body4-regular)}}.empty-state-content{display:flex;flex-direction:column;gap:var(--sys-size-5);align-items:center;justify-content:center;align-self:start}}.gemini{.empty-state-container{padding:var(--sys-size-8)}.empty-state-container .icon{display:none}.empty-state-container .header{align-items:flex-start;line-height:var(--sys-size-4)}.empty-state-content{align-items:flex-start}.empty-state-container .greeting{font-size:var(--sys-size-10);color:var(--sys-color-primary)}.empty-state-container .cta{font-size:var(--sys-size-10)}main{align-items:flex-start}}.change-summary{background-color:var(--sys-color-surface3);border-radius:var(--sys-shape-corner-medium-small);position:relative;margin:0 var(--sys-size-5) var(--sys-size-7) var(--sys-size-5);padding:0 var(--sys-size-5);&.saved-to-disk{pointer-events:none}& .header-container{display:flex;align-items:center;gap:var(--sys-size-3);height:var(--sys-size-14);padding-left:var(--sys-size-3);devtools-spinner{width:var(--sys-size-6);height:var(--sys-size-6);margin-left:var(--sys-size-3);margin-right:var(--sys-size-3)}& devtools-icon.summary-badge{width:var(--sys-size-8);height:var(--sys-size-8)}& .green-bright-icon{color:var(--sys-color-green-bright)}& .on-tonal-icon{color:var(--sys-color-on-tonal-container)}& .header-text{font:var(--sys-typescale-body4);color:var(--sys-color-on-surface);white-space:nowrap;overflow-x:hidden;text-overflow:ellipsis}& .arrow{margin-left:auto}&::marker{content:''}}&:not(.saved-to-disk, &[open]):hover::after{content:'';height:100%;width:100%;border-radius:inherit;position:absolute;top:0;left:0;pointer-events:none;background-color:var(--sys-color-state-hover-on-subtle)}&[open]:not(.saved-to-disk){&::details-content{height:fit-content;padding:var(--sys-size-2) 0;border-radius:inherit}summary .arrow{transform:rotate(180deg)}}devtools-code-block{margin-bottom:var(--sys-size-5);--code-block-background-color:var(--sys-color-surface1)}.error-container{display:flex;align-items:center;gap:var(--sys-size-3);color:var(--sys-color-error)}.footer{display:flex;flex-flow:row wrap;justify-content:space-between;margin:var(--sys-size-5) 0 var(--sys-size-5) var(--sys-size-2);gap:var(--sys-size-6) var(--sys-size-5);.disclaimer-link{align-self:center}.left-side{flex-grow:1;display:flex;align-self:center;gap:var(--sys-size-3)}.save-or-discard-buttons{flex-grow:1;display:flex;justify-content:flex-end;gap:var(--sys-size-3)}.change-workspace{display:flex;flex-direction:row;align-items:center;gap:var(--sys-size-3);min-width:var(--sys-size-22);flex:1 1 40%;.folder-name{white-space:nowrap;overflow-x:hidden;text-overflow:ellipsis}}.loading-text-container{margin-right:var(--sys-size-3);display:flex;justify-content:center;align-items:center;gap:var(--sys-size-3)}.apply-to-workspace-container{display:flex;align-items:center;gap:var(--sys-size-3);min-width:fit-content;justify-content:flex-end;flex-grow:1;flex-shrink:1;devtools-icon{width:18px;height:18px;margin-left:var(--sys-size-2)}}}}@keyframes reveal{0%,
  99%{opacity:100%}100%{opacity:0%}}.sticky{position:sticky;bottom:0;z-index:9999}.chat-input-widget{width:100%;max-width:var(--sys-size-36);background-color:var(--sys-color-cdt-base-container);box-shadow:0 1px var(--sys-color-cdt-base-container);@container (width > 688px){--half-scrollbar-width:calc((100cqw - 100%) / 2);margin-left:var(--half-scrollbar-width);margin-right:calc(-1 * var(--half-scrollbar-width))}@container (height < 224px){margin-top:var(--sys-size-4);margin-bottom:var(--sys-size-4);position:static}@container --chat-ui-container (width < 400px){padding-bottom:var(--sys-size-1)}}
/*# sourceURL=${import.meta.resolve("././components/chatView.css")} */`;var Qs={};J(Qs,{DEFAULT_VIEW:()=>Ys,ExportForAgentsDialog:()=>We});import"./../../ui/components/spinners/spinners.js";import*as Gs from"./../../core/host/host.js";import*as jt from"./../../core/i18n/i18n.js";import"./../../ui/components/buttons/buttons.js";import*as Ks from"./../../ui/components/snackbars/snackbars.js";import*as ut from"./../../ui/legacy/legacy.js";import*as Wt from"./../../ui/lit/lit.js";var Hs=`@scope to (devtools-widget > *){:scope{width:100%;box-shadow:none;padding:var(--sys-size-8);background-color:var(--sys-color-surface);border-radius:var(--sys-shape-corner-medium)}.export-for-agents-dialog{width:var(--sys-size-33);max-width:100%}.export-for-agents-dialog header{margin-bottom:var(--sys-size-6);h2{font:var(--sys-typescale-headline5);margin:0;color:var(--sys-color-on-surface)}}.export-for-agents-dialog .state-selection{display:flex;gap:var(--sys-size-5);margin:var(--sys-size-7) 0}.export-for-agents-dialog .state-selection label{display:flex;align-items:center;gap:var(--sys-size-2);cursor:pointer;font:var(--sys-typescale-body3-regular);input{margin-bottom:0}}.export-for-agents-dialog textarea{width:100%;min-height:var(--sys-size-30);max-height:var(--sys-size-34);resize:none;padding:var(--sys-size-5);box-sizing:border-box;font-family:var(--monospace-font-family);font-size:var(--monospace-font-size);background-color:var(--sys-color-surface5);color:var(--sys-color-on-surface);border-radius:var(--sys-shape-corner-small);border:none}main{position:relative}.prompt-loading{position:absolute;padding:var(--sys-size-5);display:flex;align-items:center;justify-content:flex-start;gap:var(--sys-size-5)}.export-for-agents-dialog .disclaimer{margin-top:var(--sys-size-5);font:var(--sys-typescale-body4-regular);color:var(--sys-color-on-surface-subtle)}.export-for-agents-dialog footer{display:flex;justify-content:flex-end;margin-top:var(--sys-size-6)}.export-for-agents-dialog .right-buttons{display:flex;gap:var(--sys-size-5)}}
/*# sourceURL=${import.meta.resolve("././components/exportForAgentsDialog.css")} */`;var{html:_s,render:ko}=Wt,W={exportForAgents:"Copy for your coding agent",copyToClipboard:"Copy to clipboard",copiedToClipboard:"Copied to clipboard",asPrompt:"As prompt",asMarkdown:"As markdown",saveAsMarkdown:"Save as\u2026",generatingSummary:"Generating summary\u2026",disclaimer:"This is an experimental AI feature and won\u2019t always get it right. Double check this text before pasting into another tool."},Co=jt.i18n.registerUIStrings("panels/ai_assistance/components/ExportForAgentsDialog.ts",W),H=jt.i18n.getLocalizedString.bind(void 0,Co),Ys=(t,e,s)=>{let i=t.state.activeType==="prompt",o=H(i?W.copyToClipboard:W.saveAsMarkdown),n=i&&t.state.isPromptLoading?H(W.generatingSummary):i?t.state.promptText:t.state.conversationText;ko(_s`
    <style>${Hs}</style>
    <div class="export-for-agents-dialog">
      <header>
        <h2 tabindex="-1">
          ${H(W.exportForAgents)}
        </h2>
      </header>
      <div class="state-selection">
        <label>
          <input
            type="radio"
            value="prompt"
            name="export-state"
            .checked=${i}
            @change=${()=>t.onStateChange("prompt")}
          >
          ${H(W.asPrompt)}
        </label>
        <label>
          <input
            type="radio"
            value="conversation"
            name="export-state"
            .checked=${!i}
            @change=${()=>t.onStateChange("conversation")}
          >
          ${H(W.asMarkdown)}
        </label>
      </div>
      <main>
        ${t.state.isPromptLoading?_s`
          <span class="prompt-loading">
            <devtools-spinner></devtools-spinner>
            ${H(W.generatingSummary)}
          </span>
          `:Wt.nothing}
        <textarea readonly .value=${t.state.isPromptLoading?"":n}></textarea>
      </main>
      <div class="disclaimer">${H(W.disclaimer)}</div>
      <footer>
        <div class="right-buttons">
          <devtools-button
            @click=${t.onButtonClick}
            .jslogContext=${t.jslogContext}
            .variant=${"primary"}
            .disabled=${i&&t.state.isPromptLoading}
          >
            ${o}
          </devtools-button>
        </div>
      </footer>
    </div>
  `,s)},We=class t extends ut.Widget.VBox{#o;#t;#s;#a;constructor(e,s=Ys){super(),this.#t=e.dialog,this.#s={activeType:"prompt",promptText:typeof e.promptText=="string"?e.promptText:"",conversationText:e.markdownText,isPromptLoading:typeof e.promptText!="string"},this.#a=e.onConversationSaveAs,this.#o=s,typeof e.promptText!="string"&&e.promptText.then(i=>{this.#s.promptText=i,this.#s.isPromptLoading=!1,this.requestUpdate()}),this.requestUpdate()}#n=e=>{this.#s.activeType=e,this.requestUpdate()};performUpdate(){let e,s="";switch(this.#s.activeType){case"prompt":s="ai-export-for-agents.copy-to-clipboard",e=o=>{o.preventDefault(),Gs.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#s.promptText),Ks.Snackbar.Snackbar.show({message:H(W.copiedToClipboard)}),this.#t.hide()};break;case"conversation":s="ai-export-for-agents.save-as-markdown",e=()=>{this.#t.hide(),this.#a()};break}let i={onButtonClick:e,state:this.#s,onStateChange:this.#n,jslogContext:s};this.#o(i,void 0,this.contentElement)}static show({promptText:e,markdownText:s,onConversationSaveAs:i}){let o=new ut.Dialog.Dialog;o.setAriaLabel(H(W.exportForAgents)),o.setOutsideClickCallback(r=>{r.consume(!0),o.hide()}),o.addCloseButton(),o.setSizeBehavior("MeasureContent"),o.setDimmed(!0);let n=new t({dialog:o,promptText:e,markdownText:s,onConversationSaveAs:i});n.show(o.contentElement),n.updateComplete.then(()=>{o.show()})}};var{ref:Ot,repeat:Io,classMap:Js}=Ao,{widget:Vt}=si.Widget,Xs={emptyStateText:"How can I help you?",emptyStateTextGemini:"Where should we start?"},Zs=ei.i18n.lockedString,$o=1,Lo=(t,e,s)=>{let i=!!ti.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled,o=Js({"chat-ui":!0,gemini:Bt.AiUtils.isGeminiBranding(),"ai-v2":i}),n=Js({"chat-input-widget":!0,sticky:!t.isReadOnly}),r=!i&&!t.isLoading;To(ke`
      <style>${qs}</style>
      <div class=${o}>
        <main @scroll=${t.handleScroll} ${Ot(c=>{e.mainElement=c})}>
          ${t.messages.length>0?ke`
            <div class="messages-container" ${Ot(t.handleMessageContainerRef)}>
              ${Io(t.messages,c=>Vt(ze,{message:c,isLoading:t.isLoading&&t.messages.at(-1)===c,isReadOnly:t.isReadOnly,canShowFeedbackForm:t.canShowFeedbackForm,markdownRenderer:t.markdownRenderer,isLastMessage:t.messages.at(-1)===c,isFirstMessage:t.messages.at(0)===c,onSuggestionClick:t.handleSuggestionClick,onFeedbackSubmit:t.onFeedbackSubmit,onCopyResponseClick:t.onCopyResponseClick,onExportClick:t.exportForAgentsClick,changeSummary:t.changeSummary,walkthrough:{...t.walkthrough}}))}
              ${r?Vt(Re,{changeSummary:t.changeSummary??"",changeManager:t.changeManager}):So}
            </div>
          `:ke`
            <div class="empty-state-container">
              <div class="header">
                <div class="icon">
                  <devtools-icon
                    name="smart-assistant"
                  ></devtools-icon>
                </div>
                ${Bt.AiUtils.isGeminiBranding()?ke`
                    <h1 class='greeting'>Hello</h1>
                    <p class='cta'>${Zs(Xs.emptyStateTextGemini)}</p>
                  `:ke`<h1>${Zs(Xs.emptyStateText)}</h1>`}
              </div>
              <div class="empty-state-content">
                ${t.emptyStateSuggestions.map(({title:c,jslogContext:a})=>ke`<devtools-button
                    class="suggestion"
                    @click=${()=>t.handleSuggestionClick(c)}
                    .data=${{variant:"outlined",size:"REGULAR",title:c,jslogContext:a??"suggestion",disabled:t.isTextInputDisabled}}
                  >${c}</devtools-button>`)}
              </div>
            </div>
          `}
          <devtools-widget class=${n} ${Vt(ye,{isLoading:t.isLoading,blockedByCrossOrigin:t.blockedByCrossOrigin,isTextInputDisabled:t.isTextInputDisabled,inputPlaceholder:t.inputPlaceholder,disclaimerText:t.disclaimerText,context:t.context,isContextSelected:t.isContextSelected,inspectElementToggled:t.inspectElementToggled,multimodalInputEnabled:t.multimodalInputEnabled??!1,conversationType:t.conversationType,uploadImageInputEnabled:t.uploadImageInputEnabled??!1,isReadOnly:t.isReadOnly,onContextClick:t.onContextClick,onInspectElementClick:t.onInspectElementClick,onTextSubmit:t.onTextSubmit,onCancelClick:t.onCancelClick,onNewConversation:t.onNewConversation,onContextRemoved:t.onContextRemoved,onContextAdd:t.onContextAdd})} ${Ot(c=>{e.input=c})}></devtools-widget>
        </main>
      </div>
    `,s)},Oe=class extends HTMLElement{#o=this.attachShadow({mode:"open"});#t;#s;#a;#n={};#r=new ResizeObserver(()=>this.#c());#i=!0;#m=!1;#e;#p=null;constructor(e,s=Lo){super(),this.#s=e,this.#e=s}set props(e){this.#s=e,this.#v()}connectedCallback(){this.#v(),this.#a&&this.#r.observe(this.#a)}disconnectedCallback(){this.#r.disconnect()}focusTextInput(){let e=this.#o.querySelector(".chat-input");e&&e.focus()}restoreScrollPosition(){this.#t!==void 0&&this.#n.mainElement&&this.#g(this.#t)}scrollToBottom(){this.#n.mainElement&&this.#g(this.#n.mainElement.scrollHeight)}#c(){this.#i&&this.#n.mainElement&&this.#i&&this.#g(this.#n.mainElement.scrollHeight)}#g(e){this.#n.mainElement&&(this.#t=e,this.#m=!0,this.#n.mainElement.scrollTop=e)}#h=e=>{this.#a=e,e?this.#r.observe(e):(this.#i=!0,this.#r.disconnect())};#d=e=>{if(!(!e.target||!(e.target instanceof HTMLElement))){if(this.#m){this.#m=!1;return}this.#t=e.target.scrollTop,this.#i=e.target.scrollTop+e.target.clientHeight+$o>e.target.scrollHeight}};#u=e=>{this.#n.input?.getWidget()?.setInputValue(e),this.#v(),this.focusTextInput(),ft.userMetrics.actionTaken(ft.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked)};async#f(){if(this.#p?.markdown===this.#s.conversationMarkdown)return this.#p.summary;try{let e=await this.#s.generateConversationSummary(this.#s.conversationMarkdown);return this.#p={markdown:this.#s.conversationMarkdown,summary:e},e}catch(e){return console.error(e),"Failed to generate summary."}}async#w(){let e=this.#f();We.show({promptText:e,markdownText:this.#s.conversationMarkdown,onConversationSaveAs:this.#s.onExportConversation??(async()=>{})})}#v(){this.#e({...this.#s,handleScroll:this.#d,handleSuggestionClick:this.#u,handleMessageContainerRef:this.#h,exportForAgentsClick:this.#w.bind(this)},this.#n,this.#o)}};customElements.define("devtools-ai-chat-view",Oe);var ri={};J(ri,{DEFAULT_VIEW:()=>ai,DisabledWidget:()=>He});import"./../../core/host/host.js";import*as qt from"./../../core/i18n/i18n.js";import*as oi from"./../../core/root/root.js";import*as Ve from"./../../ui/i18n/i18n.js";import*as Ce from"./../../ui/legacy/legacy.js";import{html as qe,render as Mo}from"./../../ui/lit/lit.js";import*as ni from"./../../ui/visual_logging/visual_logging.js";var ii=`@scope to (devtools-widget > *){.disabled-view{display:flex;max-width:var(--sys-size-34);border-radius:var(--sys-shape-corner-small);box-shadow:var(--sys-elevation-level3);background-color:var(--app-color-card-background);font:var(--sys-typescale-body4-regular);text-wrap:pretty;padding:var(--sys-size-6) var(--sys-size-8);margin:var(--sys-size-4);line-height:var(--sys-size-9);.disabled-view-icon-container{flex-shrink:0;border-radius:var(--sys-shape-corner-extra-small);width:var(--sys-size-9);height:var(--sys-size-9);background:linear-gradient(135deg,var(--sys-color-gradient-primary),var(--sys-color-gradient-tertiary));margin-right:var(--sys-size-5);devtools-icon{margin:var(--sys-size-2);width:var(--sys-size-8);height:var(--sys-size-8)}}}.link{color:var(--text-link);text-decoration:underline;cursor:pointer}}
/*# sourceURL=${import.meta.resolve("././components/disabledWidget.css")} */`;var Q={notLoggedIn:"This feature is only available when you are signed into Chrome with your Google account",offline:"Check your internet connection and try again",settingsLink:"AI assistance in Settings",turnOnForStyles:"Turn on {PH1} to get help with understanding CSS styles",turnOnForStylesAndRequests:"Turn on {PH1} to get help with styles and network requests",turnOnForStylesRequestsAndFiles:"Turn on {PH1} to get help with styles, network requests, and files",turnOnForStylesRequestsPerformanceAndFiles:"Turn on {PH1} to get help with styles, network requests, performance, and files",notAvailableInIncognitoMode:"AI assistance is not available in Incognito mode or Guest mode"},Be=qt.i18n.registerUIStrings("panels/ai_assistance/components/DisabledWidget.ts",Q),vt=qt.i18n.getLocalizedString.bind(void 0,Be);function Ro(t){switch(t){case"no-account-email":case"sync-is-paused":return qe`${vt(Q.notLoggedIn)}`;case"no-internet":return qe`${vt(Q.offline)}`}}function Eo(t){if(t.isOffTheRecord)return qe`${vt(Q.notAvailableInIncognitoMode)}`;let e=document.createElement("span");e.textContent=vt(Q.settingsLink),e.classList.add("link"),Ce.ARIAUtils.markAsLink(e),e.addEventListener("click",()=>{Ce.ViewManager.ViewManager.instance().showView("chrome-ai")}),e.setAttribute("jslog",`${ni.action("open-ai-settings").track({click:!0})}`);let s;return t.devToolsAiAssistancePerformanceAgent?.enabled?s=Ve.getFormatLocalizedString(Be,Q.turnOnForStylesRequestsPerformanceAndFiles,{PH1:e}):t.devToolsAiAssistanceFileAgent?.enabled?s=Ve.getFormatLocalizedString(Be,Q.turnOnForStylesRequestsAndFiles,{PH1:e}):t.devToolsAiAssistanceNetworkAgent?.enabled?s=Ve.getFormatLocalizedString(Be,Q.turnOnForStylesAndRequests,{PH1:e}):s=Ve.getFormatLocalizedString(Be,Q.turnOnForStyles,{PH1:e}),qe`${s}`}var ai=(t,e,s)=>{Mo(qe`
      <style>
        ${ii}
      </style>
      <div class="disabled-view">
        <div class="disabled-view-icon-container">
          <devtools-icon name="smart-assistant"></devtools-icon>
        </div>
        <div>
          ${t.aidaAvailability==="available"?Eo(t.hostConfig):Ro(t.aidaAvailability)}
        </div>
      </div>
    `,s)},He=class extends Ce.Widget.Widget{aidaAvailability="no-account-email";#o;constructor(e,s=ai){super(e),this.#o=s}wasShown(){super.wasShown(),this.requestUpdate()}performUpdate(){let e=oi.Runtime.hostConfig;this.#o({aidaAvailability:this.aidaAvailability,hostConfig:e},{},this.contentElement)}};var pi={};J(pi,{DEFAULT_VIEW:()=>mi,ExploreWidget:()=>_e});import*as hi from"./../../core/i18n/i18n.js";import*as gi from"./../../core/root/root.js";import*as P from"./../../ui/legacy/legacy.js";import{html as Ht,render as Po}from"./../../ui/lit/lit.js";import*as _t from"./../../ui/visual_logging/visual_logging.js";var li=`@scope to (devtools-widget > *){.ai-assistance-explore-container{&,
    *{box-sizing:border-box;margin:0;padding:0}width:100%;height:fit-content;display:flex;flex-direction:column;align-items:center;margin:auto 0;font:var(--sys-typescale-headline4);gap:var(--sys-size-8);padding:var(--sys-size-3);overflow:auto;scrollbar-gutter:stable both-edges;.link{padding:0;margin:0 3px}.header{flex-shrink:0;display:flex;flex-direction:column;width:100%;align-items:center;justify-content:center;justify-self:center;gap:var(--sys-size-4);.icon{display:flex;justify-content:center;align-items:center;height:var(--sys-size-14);width:var(--sys-size-14);border-radius:var(--sys-shape-corner-small);background:linear-gradient(135deg,var(--sys-color-gradient-primary),var(--sys-color-gradient-tertiary))}h1{font:var(--sys-typescale-headline4)}p{text-align:center;font:var(--sys-typescale-body4-regular)}.link{font:var(--sys-typescale-body4-regular)}}.content{flex-shrink:0;display:flex;flex-direction:column;gap:var(--sys-size-5);align-items:center;justify-content:center;justify-self:center}.feature-card{display:flex;padding:var(--sys-size-4) var(--sys-size-6);gap:10px;background-color:var(--sys-color-surface2);border-radius:var(--sys-shape-corner-medium-small);width:100%;align-items:center;.feature-card-icon{min-width:var(--sys-size-12);min-height:var(--sys-size-12);display:flex;justify-content:center;align-items:center;background-color:var(--sys-color-tonal-container);border-radius:var(--sys-shape-corner-full);devtools-icon{width:18px;height:18px}}.feature-card-content{h3{font:var(--sys-typescale-body3-medium)}p{font:var(--sys-typescale-body4-regular);line-height:18px}}}}.ai-assistance-explore-footer{flex-shrink:0;width:100%;display:flex;justify-content:center;align-items:center;padding-block:var(--sys-size-3);font:var(--sys-typescale-body5-regular);border-top:1px solid var(--sys-color-divider);text-wrap:balance;text-align:center;p{margin:0;padding:0}}}
/*# sourceURL=${import.meta.resolve("././components/exploreWidget.css")} */`;var ci={Explore:"Explore AI assistance",learnAbout:"Learn about AI in DevTools"},di=hi.i18n.lockedString,mi=(t,e,s)=>{function i(o){return Ht`Open
     <button
       class="link"
       role="link"
       jslog=${_t.link(o.jslogContext).track({click:!0})}
       @click=${o.onClick}
     >${o.panelName}</button>
     ${o.text}`}Po(Ht`
      <style>
        ${li}
      </style>
      <div class="ai-assistance-explore-container">
        <div class="header">
          <div class="icon">
            <devtools-icon name="smart-assistant"></devtools-icon>
          </div>
          <h1>${di(ci.Explore)}</h1>
          <p>
            To chat about an item, right-click and select${" "}
            <strong>Ask AI</strong>.
            <button
              class="link"
              role="link"
              jslog=${_t.link("open-ai-settings").track({click:!0})}
              @click=${()=>{P.ViewManager.ViewManager.instance().showView("chrome-ai")}}
            >${di(ci.learnAbout)}
            </button>
          </p>
        </div>
        <div class="content">
          ${t.featureCards.map(o=>Ht`
              <div class="feature-card">
                <div class="feature-card-icon">
                  <devtools-icon name=${o.icon}></devtools-icon>
                </div>
                <div class="feature-card-content">
                  <h3>${o.heading}</h3>
                  <p>${i(o)}</p>
                </div>
              </div>
            `)}
        </div>
      </div>
    `,s)},_e=class extends P.Widget.Widget{#o;constructor(e,s=mi){super(e),this.#o=s}wasShown(){super.wasShown(),this.requestUpdate()}performUpdate(){let e=gi.Runtime.hostConfig,s=[];e.devToolsFreestyler?.enabled&&P.ViewManager.ViewManager.instance().hasView("elements")&&s.push({icon:"brush-2",heading:"CSS styles",jslogContext:"open-elements-panel",onClick:()=>{P.ViewManager.ViewManager.instance().showView("elements")},panelName:"Elements",text:"to ask about CSS styles"}),e.devToolsAiAssistanceNetworkAgent?.enabled&&P.ViewManager.ViewManager.instance().hasView("network")&&s.push({icon:"arrow-up-down",heading:"Network",jslogContext:"open-network-panel",onClick:()=>{P.ViewManager.ViewManager.instance().showView("network")},panelName:"Network",text:"to ask about a request's details"}),e.devToolsAiAssistanceFileAgent?.enabled&&P.ViewManager.ViewManager.instance().hasView("sources")&&s.push({icon:"document",heading:"Files",jslogContext:"open-sources-panel",onClick:()=>{P.ViewManager.ViewManager.instance().showView("sources")},panelName:"Sources",text:"to ask about a file's content"}),e.devToolsAiAssistancePerformanceAgent?.enabled&&P.ViewManager.ViewManager.instance().hasView("timeline")&&s.push({icon:"performance",heading:"Performance",jslogContext:"open-performance-panel",onClick:()=>{P.ViewManager.ViewManager.instance().showView("timeline")},panelName:"Performance",text:"to ask about a trace item"}),this.#o({featureCards:s},{},this.contentElement)}};import*as ui from"./../../core/common/common.js";import*as Ae from"./../../core/sdk/sdk.js";import*as fi from"./../../models/trace/trace.js";import*as yt from"./../../ui/lit/lit.js";import*as vi from"./../common/common.js";var{html:Gt}=yt.StaticHtml,{until:Do}=yt.Directives,Ge=class extends V{mainFrameId;lookupEvent;constructor(e="",s=()=>null){super(),this.mainFrameId=e,this.lookupEvent=s}templateForToken(e){if(e.type==="link"&&e.href.startsWith("#")){if(e.href.startsWith("#node-")){let n=Number(e.href.replace("#node-",""));return Gt`<span>${Do(this.#o(n,e.text).then(r=>r||e.text),e.text)}</span>`}let s=this.lookupEvent(e.href.slice(1));if(!s)return Gt`${e.text}`;let i=e.text,o="";return fi.Types.Events.isSyntheticNetworkRequest(s)?o=s.args.data.url:i+=` (${s.name})`,Gt`<a href="#" draggable=false .title=${o} @click=${n=>{n.stopPropagation(),ui.Revealer.reveal(new Ae.TraceObject.RevealableEvent(s))}}>${i}</a>`}return super.templateForToken(e)}async#o(e,s){if(e===void 0)return;let o=Ae.TargetManager.TargetManager.instance().primaryPageTarget()?.model(Ae.DOMModel.DOMModel);if(!o)return;let r=(await o.pushNodesByBackendIdsToFrontend(new Set([e])))?.get(e);return!r||r.frameId()!==this.mainFrameId?void 0:vi.DOMLinkifier.Linkifier.instance().linkify(r,{textContent:s})}};import*as bt from"./../../core/sdk/sdk.js";import*as wi from"./../../third_party/marked/marked.js";import*as xt from"./../../ui/lit/lit.js";import*as bi from"./../common/common.js";var{html:D}=xt.StaticHtml,{until:yi}=xt.Directives,wt=class t extends V{mainFrameId;constructor(e=""){super(),this.mainFrameId=e}#o(e){if(!Array.isArray(e)||e.length===0||typeof e[0]!="object"||e[0]===null)return null;let s=Object.keys(e[0]);if(!["Problem","Element","NodeId","Details"].every(n=>s.includes(n)))return null;let o=s.indexOf("Problem");if(o>-1){let n=s.splice(o,1);s.unshift(...n)}return D`
      <table style="width: 100%;">
        <thead>
          <tr>
            ${s.map(n=>D`<th style="text-align: left;">${n==="NodeId"?"":n}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${e.flatMap(n=>D`
            <tr>
              ${s.map(r=>r==="NodeId"?D`<td>${this.#s(n[r])}</td>`:r==="Details"?D`<td><a href="#" @click=${this.#t}>Details</a></td>`:D`<td>${n[r]}</td>`)}
            </tr>
            <tr class="details-row" style="display: none;">
              <td colspan=${s.length} style="background-color: #f0f0f0; padding: 1em;">
                <devtools-markdown-view .data=${{tokens:wi.Marked.lexer(n.Details),renderer:new t(this.mainFrameId)}}></devtools-markdown-view>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
      <br><div>To investigate these problems, please click one of the provided links (above), to set as context, and ask me further questions about the problem.</div>
    `}templateForToken(e){if(e.type==="code")try{let s=JSON.parse(e.text),i=this.#o(s);if(i)return i}catch{}if(e.type==="link"&&e.href.startsWith("#")){let s;if(e.href.startsWith("#node-")?s=Number(e.href.replace("#node-","")):e.href.startsWith("#")&&(s=Number(e.href.replace("#",""))),s)return D`<span>${yi(this.#n(s,e.text).then(i=>i||e.text),e.text)}</span>`}return super.templateForToken(e)}#t(e){e.preventDefault();let s=e.target,i=s.closest("tr");if(!i)return;let o=i.nextElementSibling;o?.classList.contains("details-row")&&(o.style.display==="none"?(o.style.display="table-row",s.textContent="Hide"):(o.style.display="none",s.textContent="Details"))}#s(e){if(e.indexOf(",")===-1){let i=Number(e);return isNaN(i)?D`${e}`:this.#a(i)}let s=e.split(",").map(i=>i.trim()).filter(Boolean);return D`${s.map(i=>{let o=Number(i);return isNaN(o)?D`<div>${i}</div>`:D`<div>${this.#a(o)}</div>`})}`}#a(e){let s="link";return D`<span>${yi(this.#n(e,s).then(i=>i||s),s)}</span>`}async#n(e,s){if(e===void 0)return;let o=bt.TargetManager.TargetManager.instance().primaryPageTarget()?.model(bt.DOMModel.DOMModel);if(!o)return;let r=(await o.pushNodesByBackendIdsToFrontend(new Set([e])))?.get(e);return!r||r.frameId()!==this.mainFrameId?void 0:bi.DOMLinkifier.Linkifier.instance().linkify(r,{textContent:s})}};var Ci={};J(Ci,{saveToDisk:()=>Yt});import*as xi from"./../../core/platform/platform.js";import*as ki from"./../../models/text_utils/text_utils.js";import*as Kt from"./../../models/workspace/workspace.js";async function Yt(t){let e=t.getConversationMarkdown(),s=new ki.ContentData.ContentData(e,!1,"text/markdown"),i=xi.StringUtilities.toSnakeCase(t.title||""),o="devtools_",n=".md",r=64-o.length-n.length,c=i||"conversation";c.length>r&&(c=c.substring(0,r));let a=`${o}${c}${n}`;await Kt.FileManager.FileManager.instance().save(a,s,!0),Kt.FileManager.FileManager.instance().close(a)}var{html:_}=O,{widget:Qt}=h.Widget,Fo="https://crbug.com/364805393",Uo="https://developer.chrome.com/docs/devtools/ai-assistance",No=700,zo=400,S={newChat:"New chat",help:"Help",settings:"Settings",sendFeedback:"Send feedback",newChatCreated:"New chat created",chatDeleted:"Chat deleted",history:"History",deleteChat:"Delete local chat",clearChatHistory:"Clear local chats",exportConversation:"Export conversation",noPastConversations:"No past conversations",followTheSteps:"Follow the steps above to ask a question",inputDisclaimerForEmptyState:"This is an experimental AI feature and won't always get it right.",responseCopiedToClipboard:"Response copied to clipboard"},v={answerLoading:"Answer loading",answerReady:"Answer ready",analyzingData:"Analyzing data",crossOriginError:"To talk about data from another origin, start a new chat",inputPlaceholderForStyling:"Ask a question about the selected element",inputPlaceholderForNetwork:"Ask a question about the selected network request",inputPlaceholderForFile:"Ask a question about the selected file",inputPlaceholderForPerformanceWithNoRecording:"Record a performance trace and select an item to ask a question",inputPlaceholderForStylingNoContext:"Select an element to ask a question",inputPlaceholderForNetworkNoContext:"Select a network request to ask a question",inputPlaceholderForFileNoContext:"Select a file to ask a question",inputPlaceholderForPerformanceTrace:"Ask a question about the selected performance trace",inputPlaceholderForPerformanceTraceNoContext:"Record or select a performance trace to ask a question",inputPlaceholderForNoContext:"Ask AI Assistance",inputPlaceholderForNoContextBranded:"Ask Gemini",inputDisclaimerForStyling:"Chat messages and any data the inspected page can access via Web APIs are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForStylingEnterpriseNoLogging:"Chat messages and any data the inspected page can access via Web APIs are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForNetwork:"Chat messages and the selected network request are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForNetworkEnterpriseNoLogging:"Chat messages and the selected network request are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForFile:"Chat messages and the selected file are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won't always get it right.",inputDisclaimerForFileEnterpriseNoLogging:"Chat messages and the selected file are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForPerformance:"Chat messages and trace data from your performance trace are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won't always get it right.",inputDisclaimerForPerformanceEnterpriseNoLogging:"Chat messages and data from your performance trace are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForNoContext:"Chat messages, any data the inspected page can see using Web APIs, and the items you select such as files, network requests, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForNoContextEnterpriseNoLogging:"Chat messages, any data the inspected page can see using Web APIs, and the items you select such as files, network requests, and performance traces are sent to Google. This data will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",inputPlaceholderForAccessibility:"Ask a question about the selected Lighthouse report",inputPlaceholderForAccessibilityNoContext:"Generate a Lighthouse report to ask a question",inputDisclaimerForAccessibility:"Chat messages and the selected Lighthouse report are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\u2019t always get it right.",inputDisclaimerForAccessibilityEnterpriseNoLogging:"Chat messages and the selected Lighthouse report are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right."},jo=At.i18n.registerUIStrings("panels/ai_assistance/AiAssistancePanel.ts",S),T=At.i18n.getLocalizedString.bind(void 0,jo),y=At.i18n.lockedString;function kt(t){return t&&(pe.Prototypes.instance().isEnabled("emulationCapabilities")||t.nodeType()===Node.ELEMENT_NODE)?t:null}async function Wo(t){let e=t?.selectedContext;if(e){let s=await e.getSuggestions();if(s)return s}if(!t?.type||t.isReadOnly)return[];switch(t.type){case"freestyler":return[{title:"What can you help me with?",jslogContext:"styling-default"},{title:"Why isn\u2019t this element visible?",jslogContext:"styling-default"},{title:pe.Prototypes.instance().isEnabled("emulationCapabilities")?"Are there display issues on this page for people using an Android phone?":"How do I center this element?",jslogContext:"styling-default"}];case"drjones-file":return[{title:"What does this script do?",jslogContext:"file-default"},{title:"Is the script optimized for performance?",jslogContext:"file-default"},{title:"Does the script handle user input safely?",jslogContext:"file-default"}];case"accessibility":return[{title:"What are the accessibility issues on this page?",jslogContext:"accessibility-default"},{title:"How can I fix these accessibility issues?",jslogContext:"accessibility-default"},{title:"What does this Lighthouse report say about accessibility?",jslogContext:"accessibility-default"}];case"drjones-network-request":return[{title:"Why is this network request taking so long?",jslogContext:"network-default"},{title:"Are there any security headers present?",jslogContext:"network-default"},{title:"Why is the request failing?",jslogContext:"network-default"}];case"drjones-performance-full":return[{title:"What performance issues exist with my page?",jslogContext:"performance-default"}];case"breakpoint":return[{title:"Why did the code pause here?"},{title:"What function does this breakpoint belong to?"},{title:"Why is this error thrown?"}];case"none":return[{title:"What can you help me with?",jslogContext:"empty"},{title:"What performance issues exist on the page?",jslogContext:"empty"},{title:"What are the slowest network requests on this page?",jslogContext:"empty"}];default:Li.assertNever(t.type,"Unknown conversation type")}}function Oo(t){let e=t?.selectedContext;if(e instanceof g.PerformanceAgent.PerformanceTraceContext){if(!e.external){let s=e.getItem();return new Ge(s.parsedTrace.data.Meta.mainFrameId,s.lookupEvent.bind(s))}}else{if(t?.type==="drjones-performance-full")return new Ge;if(pe.Prototypes.instance().isEnabled("emulationCapabilities")&&t?.type==="freestyler"&&u.TargetManager.TargetManager.instance().primaryPageTarget()?.model(u.DOMModel.DOMModel)){let o=u.TargetManager.TargetManager.instance().primaryPageTarget()?.model(u.DOMModel.DOMModel)?.target().model(u.ResourceTreeModel.ResourceTreeModel)?.mainFrame?.id;return new wt(o)}else if(t?.type==="accessibility"){let o=u.TargetManager.TargetManager.instance().primaryPageTarget()?.model(u.DOMModel.DOMModel)?.target().model(u.ResourceTreeModel.ResourceTreeModel)?.mainFrame?.id;return new Qe(o)}}return new V}function Ai(t){let e=!!R.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled;return _`
    <div class="toolbar-container" role="toolbar" jslog=${Ye.toolbar()}>
      <devtools-toolbar class="freestyler-left-toolbar" role="presentation">
      ${t.showChatActions?_`<devtools-button
          title=${T(S.newChat)}
          aria-label=${T(S.newChat)}
          .iconName=${"plus"}
          .jslogContext=${"freestyler.new-chat"}
          .variant=${"toolbar"}
          @click=${t.onNewChatClick}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-menu-button
          title=${T(S.history)}
          aria-label=${T(S.history)}
          .iconName=${"history"}
          .jslogContext=${"freestyler.history"}
          .populateMenuCall=${t.populateHistoryMenu}
        ></devtools-menu-button>`:O.nothing}
        ${t.showActiveConversationActions?_`
          <devtools-button
              title=${T(S.deleteChat)}
              aria-label=${T(S.deleteChat)}
              .iconName=${"bin"}
              .jslogContext=${"freestyler.delete"}
              .variant=${"toolbar"}
              @click=${t.onDeleteClick}>
          </devtools-button>
          ${e?O.nothing:_`
            <devtools-button
              title=${T(S.exportConversation)}
              aria-label=${T(S.exportConversation)}
              .iconName=${"download"}
              .disabled=${t.isLoading}
              .jslogContext=${"export-ai-conversation"}
              .variant=${"toolbar"}
              @click=${t.onExportConversationClick}>
            </devtools-button>
            `}`:O.nothing}
      </devtools-toolbar>
      <devtools-toolbar class="freestyler-right-toolbar" role="presentation">
        <devtools-link
          class="toolbar-feedback-link"
          title=${T(S.sendFeedback)}
          href=${Fo}
          jslogcontext=${"freestyler.send-feedback"}
        >${T(S.sendFeedback)}</devtools-link>
        <div class="toolbar-divider"></div>
        <devtools-button
          title=${T(S.help)}
          aria-label=${T(S.help)}
          .iconName=${"help"}
          .jslogContext=${"freestyler.help"}
          .variant=${"toolbar"}
          @click=${t.onHelpClick}></devtools-button>
        <devtools-button
          title=${T(S.settings)}
          aria-label=${T(S.settings)}
          .iconName=${"gear"}
          .jslogContext=${"freestyler.settings"}
          .variant=${"toolbar"}
          @click=${t.onSettingsClick}></devtools-button>
      </devtools-toolbar>
    </div>
  `}function Si(t,e,s){function i(){switch(t.state){case"chat-view":return _`<devtools-ai-chat-view
          .props=${t.props}
          ${O.Directives.ref(o=>{!o||!(o instanceof Oe)||(e.chatView=o)})}
        ></devtools-ai-chat-view>`;case"explore-view":return _`<devtools-widget class="fill-panel" ${Qt(_e)}>
                    </devtools-widget>`;case"disabled-view":return _`<devtools-widget class="fill-panel" ${Qt(He,t.props)}>
                    </devtools-widget>`}}if(R.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled||pe.Prototypes.instance().isEnabled("breakpointDebuggerAgent")){let o=t.state==="chat-view"&&t.props.walkthrough.isExpanded,n=!1;if(t.state==="chat-view"){let r=t.props.messages.at(-1);r&&t.props.walkthrough.activeSidebarMessage===r&&(n=!0)}O.render(_`
      ${Ai(t)}
      <div class="ai-assistance-view-container">
        <devtools-split-view
          name="ai-assistance-split-view-state"
          direction="column"
          sidebar-position="second"
          sidebar-visibility=${o&&!t.props.walkthrough.isInlined?"visible":"hidden"}
          sidebar-initial-size=${zo}
        >
          <div slot="main" class="main-view">
            ${i()}
          </div>
          <div slot="sidebar" class="sidebar-view">
            ${o?_`
              <devtools-widget ${Qt(he,{message:t.props.walkthrough.activeSidebarMessage,isLoading:t.props.isLoading&&n,markdownRenderer:t.props.markdownRenderer,onToggle:t.props.walkthrough.onToggle})}></devtools-widget>`:O.nothing}
          </div>
        </devtools-split-view>
      </div>
    `,s)}else O.render(_`
      ${Ai(t)}
      <div class="ai-assistance-view-container">${i()}</div>
    `,s)}function Ti(t){return t?new g.StylingAgent.NodeContext(t):null}function Vo(t){return t?new g.FileAgent.FileContext(t):null}function Bo(t){return t?new g.BreakpointDebuggerAgent.BreakpointContext(t):null}function Ii(t){return t?new g.AccessibilityAgent.AccessibilityContext(t.report):null}function qo(t){if(!t)return null;let e=me.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();return new g.NetworkAgent.RequestContext(t,e)}function Ho(t){return t?new g.PerformanceAgent.PerformanceTraceContext(t):null}var Jt,Ct=class t extends h.Panel.Panel{view;static panelName="freestyler";#o;#t;#s;#a={};#n=Ko();#r;#i=new g.ChangeManager.ChangeManager;#m=new F.Mutex.Mutex;#e;#p=null;#c=null;#g=null;#h=null;#d=null;#u=null;#f=[];#w=!1;#v;#b=null;#C=new AbortController;#l={isInlined:!1,isExpanded:!1,activeSidebarMessage:null,inlineExpandedMessages:[]};constructor(e=Si,{aidaClient:s,aidaAvailability:i}){super(t.panelName),this.view=e,this.registerRequiredCSS(es),this.#r=this.#I(),this.#t=s,this.#v=i,h.ActionRegistry.ActionRegistry.instance().hasAction("elements.toggle-element-search")&&(this.#o=h.ActionRegistry.ActionRegistry.instance().getAction("elements.toggle-element-search")),g.AiHistoryStorage.AiHistoryStorage.instance().addEventListener("AiHistoryDeleted",this.#le,this)}#M(){return{isLoading:this.#w,showChatActions:this.#Z(),showActiveConversationActions:!!(this.#e&&!this.#e.isEmpty),onNewChatClick:this.#N.bind(this),populateHistoryMenu:this.#re.bind(this),onDeleteClick:this.#ce.bind(this),onExportConversationClick:this.#_.bind(this),onHelpClick:()=>{Ri.openInNewTab(Uo)},onSettingsClick:()=>{h.ViewManager.ViewManager.instance().showView("chrome-ai")}}}async#R(){let e=R.Runtime.hostConfig.aidaAvailability?.blockedByAge===!0;if(this.#v!=="available"||!this.#r?.getIfNotDisabled()||e)return{state:"disabled-view",props:{aidaAvailability:this.#v}};if(this.#e){let s=await Wo(this.#e),i=Oo(this.#e),o=null;return Se()&&this.#L(this.#x())&&(o=this.#ne.bind(this)),{state:"chat-view",props:{blockedByCrossOrigin:this.#e.isBlockedByOrigin,isLoading:this.#w,messages:this.#f,context:this.#e.selectedContext??this.#L(this.#x()),isContextSelected:!!this.#e.selectedContext,conversationType:this.#e.type,isReadOnly:this.#e.isReadOnly??!1,changeSummary:this.#Y(),inspectElementToggled:this.#o?.toggled()??!1,canShowFeedbackForm:this.#n,multimodalInputEnabled:Zt()&&this.#e.type==="freestyler",isTextInputDisabled:this.#X(),emptyStateSuggestions:s,inputPlaceholder:this.#ee(),disclaimerText:this.#te(),onExportConversation:this.#_.bind(this),changeManager:this.#i,uploadImageInputEnabled:Go()&&this.#e.type==="freestyler",markdownRenderer:i,conversationMarkdown:this.#e.getConversationMarkdown(),generateConversationSummary:async n=>(this.#s||(this.#s=new g.ConversationSummaryAgent.ConversationSummaryAgent({aidaClient:this.#t,serverSideLoggingEnabled:this.#n})),await this.#s.summarizeConversation(n)),onTextSubmit:async(n,r,c)=>{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceQuerySubmitted),await this.#j(n,r,c)},onInspectElementClick:this.#J.bind(this),onFeedbackSubmit:this.#se.bind(this),onCancelClick:this.#z.bind(this),onContextClick:this.#ie.bind(this),onNewConversation:this.#N.bind(this),onCopyResponseClick:this.#Q.bind(this),onContextRemoved:Se()?this.#oe.bind(this):null,onContextAdd:o,walkthrough:{onToggle:this.#F.bind(this),onOpen:this.#A.bind(this),isExpanded:this.#l.isExpanded,isInlined:this.#l.isInlined,activeSidebarMessage:this.#l.activeSidebarMessage,inlineExpandedMessages:this.#l.inlineExpandedMessages}}}}return{state:"explore-view"}}onResize(){super.onResize(),R.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled&&this.#E()}#E(){let e=this.contentElement.offsetWidth<No;if(e!==this.#l.isInlined){if(this.#l.isInlined=e,!this.#l.isExpanded){this.#l.activeSidebarMessage=null,this.#l.inlineExpandedMessages=[],this.requestUpdate();return}e?this.#l.inlineExpandedMessages=this.#l.activeSidebarMessage?[this.#l.activeSidebarMessage]:[]:this.#l.activeSidebarMessage=this.#l.inlineExpandedMessages.at(-1)??null,this.requestUpdate()}}#A(e){this.#l.inlineExpandedMessages.includes(e)||this.#l.inlineExpandedMessages.push(e),this.#l.activeSidebarMessage=e,this.#l.isExpanded=!0,this.requestUpdate()}#F(e,s){if(e){this.#A(s);return}this.#l.inlineExpandedMessages=this.#l.inlineExpandedMessages.filter(i=>i!==s),this.#l.isInlined?(this.#l.isExpanded=this.#l.inlineExpandedMessages.length>0,this.#l.activeSidebarMessage===s&&(this.#l.activeSidebarMessage=this.#l.inlineExpandedMessages.at(-1)??null)):(this.#l.isExpanded=!1,this.#l.activeSidebarMessage=null),this.requestUpdate()}#I(){try{return F.Settings.moduleSetting("ai-assistance-enabled")}catch{return}}static async instance(e={forceNew:null}){let{forceNew:s}=e;if(!Jt||s){let i=new w.AidaClient.AidaClient,o=await w.AidaClient.AidaClient.checkAccessPreconditions();Jt=new t(Si,{aidaClient:i,aidaAvailability:o})}return Jt}#k(){let e=h.Context.Context.instance().flavor(Ie.TimelinePanel.TimelinePanel);e!==this.#b&&(this.#b?.removeEventListener("IsViewingTrace",this.requestUpdate,this),this.#b=e,this.#b&&this.#b.addEventListener("IsViewingTrace",this.requestUpdate,this))}async#S(){return await Ie.TimelinePanel.TimelinePanel.executeRecordAndReload()}async#T(e){return await Ke.LighthousePanel.LighthousePanel.executeLighthouseRecording({isAIControlled:!0,...e})}#x(){let{hostConfig:e}=R.Runtime,s=h.ViewManager.ViewManager.instance(),i=s.isViewVisible("elements"),o=s.isViewVisible("network"),n=s.isViewVisible("sources"),r=s.isViewVisible("timeline"),c=s.isViewVisible("lighthouse"),a;return i&&e.devToolsFreestyler?.enabled?a="freestyler":o&&e.devToolsAiAssistanceNetworkAgent?.enabled?a="drjones-network-request":n&&this.#e?.type==="breakpoint"?a="breakpoint":n&&e.devToolsAiAssistanceFileAgent?.enabled?a="drjones-file":r&&e.devToolsAiAssistancePerformanceAgent?.enabled?a="drjones-performance-full":c&&e.devToolsAiAssistanceAccessibilityAgent?.enabled&&(a="accessibility"),Se()&&!a?"none":a}#$(){if(this.#w){this.requestUpdate();return}if(this.#e&&!this.#e.isEmpty){this.requestUpdate();return}let e=this.#x();if(this.#e?.type===e){this.requestUpdate();return}let s=e?new g.AiConversation.AiConversation({type:e,data:[],isReadOnly:!1,aidaClient:this.#t,changeManager:this.#i,isExternal:!1,performanceRecordAndReload:this.#S.bind(this),onInspectElement:this.#D.bind(this),networkTimeCalculator:me.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),lighthouseRecording:this.#T.bind(this)}):void 0;this.#y(s)}#y(e){if(this.#e!==e){if(this.#z(),this.#f=[],this.#w=!1,this.#e?.archiveConversation(),!e){let s=this.#x();s&&(e=new g.AiConversation.AiConversation({type:s,data:[],isReadOnly:!1,aidaClient:this.#t,changeManager:this.#i,isExternal:!1,performanceRecordAndReload:this.#S.bind(this),onInspectElement:this.#D.bind(this),networkTimeCalculator:me.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),lighthouseRecording:this.#T.bind(this)}))}this.#e=e}if(this.#e)if(this.#e.isEmpty&&Se()){let s=this.#L(this.#x());this.#e.setContext(s)}else{let s=this.#L(this.#e.type);(s||!Se())&&this.#e.setContext(s)}this.requestUpdate()}async handleBreakpointConversation(e,s){let i=new g.BreakpointDebuggerAgent.BreakpointContext(e);this.#d=i;let o=new g.AiConversation.AiConversation({type:"breakpoint",data:[],isReadOnly:!1,aidaClient:this.#t,changeManager:this.#i,isExternal:!1,performanceRecordAndReload:this.#S.bind(this),onInspectElement:this.#D.bind(this),networkTimeCalculator:me.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),lighthouseRecording:this.#T.bind(this)});this.#y(o),this.#e?.setContext(i),this.requestUpdate(),await h.ViewManager.ViewManager.instance().showView(t.panelName);let n=s?`debug the error "${s}" using breakpoint debugging agent`:"debug the error using breakpoint debugging agent";await this.#j(n)}wasShown(){super.wasShown(),this.#a.chatView?.restoreScrollPosition(),this.#a.chatView?.focusTextInput(),this.#U(),this.#c=Ti(kt(h.Context.Context.instance().flavor(u.DOMModel.DOMNode))),this.#h=qo(h.Context.Context.instance().flavor(u.NetworkRequest.NetworkRequest)),this.#g=Ho(h.Context.Context.instance().flavor(g.AIContext.AgentFocus)),this.#p=Vo(h.Context.Context.instance().flavor(Te.UISourceCode.UISourceCode)),this.#d=Bo(h.Context.Context.instance().flavor(Te.UISourceCode.UILocation)),this.#u=Ii(h.Context.Context.instance().flavor(Ke.LighthousePanel.ActiveLighthouseReport)),this.#y(this.#e),this.#r?.addChangeListener(this.requestUpdate,this),w.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged",this.#U),this.#o?.addEventListener("Toggled",this.requestUpdate,this),h.Context.Context.instance().addFlavorChangeListener(u.DOMModel.DOMNode,this.#W),h.Context.Context.instance().addFlavorChangeListener(u.NetworkRequest.NetworkRequest,this.#O),h.Context.Context.instance().addFlavorChangeListener(g.AIContext.AgentFocus,this.#V),h.Context.Context.instance().addFlavorChangeListener(Te.UISourceCode.UISourceCode,this.#B),h.Context.Context.instance().addFlavorChangeListener(Te.UISourceCode.UILocation,this.#K),h.Context.Context.instance().addFlavorChangeListener(Ke.LighthousePanel.ActiveLighthouseReport,this.#q),h.ViewManager.ViewManager.instance().addEventListener("ViewVisibilityChanged",this.#$,this),u.TargetManager.TargetManager.instance().addModelListener(u.DOMModel.DOMModel,u.DOMModel.Events.AttrModified,this.#P,this),u.TargetManager.TargetManager.instance().addModelListener(u.DOMModel.DOMModel,u.DOMModel.Events.AttrRemoved,this.#P,this),h.Context.Context.instance().addFlavorChangeListener(Ie.TimelinePanel.TimelinePanel,this.#k,this),this.#k(),this.#$(),w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistancePanelOpened)}willHide(){super.willHide(),this.#r?.removeChangeListener(this.requestUpdate,this),w.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged",this.#U),this.#o?.removeEventListener("Toggled",this.requestUpdate,this),h.Context.Context.instance().removeFlavorChangeListener(u.DOMModel.DOMNode,this.#W),h.Context.Context.instance().removeFlavorChangeListener(u.NetworkRequest.NetworkRequest,this.#O),h.Context.Context.instance().removeFlavorChangeListener(g.AIContext.AgentFocus,this.#V),h.Context.Context.instance().removeFlavorChangeListener(Te.UISourceCode.UISourceCode,this.#B),h.Context.Context.instance().removeFlavorChangeListener(Ke.LighthousePanel.ActiveLighthouseReport,this.#q),h.ViewManager.ViewManager.instance().removeEventListener("ViewVisibilityChanged",this.#$,this),h.Context.Context.instance().removeFlavorChangeListener(Ie.TimelinePanel.TimelinePanel,this.#k,this),u.TargetManager.TargetManager.instance().removeModelListener(u.DOMModel.DOMModel,u.DOMModel.Events.AttrModified,this.#P,this),u.TargetManager.TargetManager.instance().removeModelListener(u.DOMModel.DOMModel,u.DOMModel.Events.AttrRemoved,this.#P,this),this.#b&&(this.#b.removeEventListener("IsViewingTrace",this.requestUpdate,this),this.#b=null)}#U=async()=>{let e=await w.AidaClient.AidaClient.checkAccessPreconditions();e!==this.#v&&(this.#v=e,this.requestUpdate())};#W=e=>{this.#c?.getItem()!==e.data&&(this.#c=Ti(kt(e.data)),this.#y(this.#e))};#P=e=>{this.#c?.getItem()===e.data.node&&(e.data.name==="class"||e.data.name==="id")&&this.requestUpdate()};#O=e=>{if(this.#h?.getItem()!==e.data){if(e.data){let s=me.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();this.#h=new g.NetworkAgent.RequestContext(e.data,s)}else this.#h=null;this.#y(this.#e)}};#V=e=>{this.#g?.getItem()!==e.data&&(this.#g=e.data?new g.PerformanceAgent.PerformanceTraceContext(e.data):null,this.#y(this.#e))};#B=e=>{let s=e.data;!s||this.#p?.getItem()===s||(this.#p=new g.FileAgent.FileContext(e.data),this.#y(this.#e))};#K=e=>{let s=e.data;!s||this.#d?.getItem()===s||(this.#d=new g.BreakpointDebuggerAgent.BreakpointContext(s),this.#y(this.#e))};#q=e=>{let s=e.data;this.#u?.getItem()!==s?.report&&(this.#u=Ii(s),this.#y(this.#e))};#Y(){if(!de()||!this.#e||this.#e?.isReadOnly)return;let e=!!R.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled;return this.#i.formatChangesForPatching(this.#e.id,!e)}async performUpdate(){let e={...this.#M(),...await this.#R()};this.view(e,this.#a,this.contentElement)}#Q(e){let s=_o(e);s&&(w.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(s),Mi.Snackbar.Snackbar.show({message:T(S.responseCopiedToClipboard)}))}#J(){h.Context.Context.instance().setFlavor(F.ReturnToPanel.ReturnToPanelFlavor,new F.ReturnToPanel.ReturnToPanelFlavor(this.panelName)),this.#o?.execute()}#X(){return!!(this.#e&&this.#e.isBlockedByOrigin||!this.#e||!this.#e.selectedContext&&!Se())}#Z(){let e=this.#r?.getIfNotDisabled(),s=R.Runtime.hostConfig.aidaAvailability?.blockedByAge===!0;return!(!e||s||this.#v==="no-account-email"||this.#v==="sync-is-paused")}#ee(){if(!this.#e)return T(S.followTheSteps);if(this.#e&&this.#e.isBlockedByOrigin)return y(v.crossOriginError);switch(this.#e.type){case"freestyler":return this.#e.selectedContext?y(v.inputPlaceholderForStyling):y(v.inputPlaceholderForStylingNoContext);case"drjones-file":return this.#e.selectedContext?y(v.inputPlaceholderForFile):y(v.inputPlaceholderForFileNoContext);case"drjones-network-request":return this.#e.selectedContext?y(v.inputPlaceholderForNetwork):y(v.inputPlaceholderForNetworkNoContext);case"drjones-performance-full":return h.Context.Context.instance().flavor(Ie.TimelinePanel.TimelinePanel)?.hasActiveTrace()?this.#e.selectedContext?y(v.inputPlaceholderForPerformanceTrace):y(v.inputPlaceholderForPerformanceTraceNoContext):y(v.inputPlaceholderForPerformanceWithNoRecording);case"breakpoint":return y(v.inputPlaceholderForNoContext);case"accessibility":return this.#e.selectedContext?y(v.inputPlaceholderForAccessibility):y(v.inputPlaceholderForAccessibilityNoContext);case"none":return g.AiUtils.isGeminiBranding()?y(v.inputPlaceholderForNoContextBranded):y(v.inputPlaceholderForNoContext)}}#te(){if(!this.#e||this.#e.isReadOnly)return T(S.inputDisclaimerForEmptyState);let e=R.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue===R.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;switch(this.#e.type){case"freestyler":return y(e?v.inputDisclaimerForStylingEnterpriseNoLogging:v.inputDisclaimerForStyling);case"drjones-file":return y(e?v.inputDisclaimerForFileEnterpriseNoLogging:v.inputDisclaimerForFile);case"drjones-network-request":return y(e?v.inputDisclaimerForNetworkEnterpriseNoLogging:v.inputDisclaimerForNetwork);case"drjones-performance-full":return y(e?v.inputDisclaimerForPerformanceEnterpriseNoLogging:v.inputDisclaimerForPerformance);case"accessibility":return y(e?v.inputDisclaimerForAccessibilityEnterpriseNoLogging:v.inputDisclaimerForAccessibility);case"breakpoint":case"none":return y(e?v.inputDisclaimerForNoContextEnterpriseNoLogging:v.inputDisclaimerForNoContext)}}#se(e,s,i){this.#t.registerClientEvent({corresponding_aida_rpc_global_id:e,disable_user_content_logging:!this.#n,do_conversation_client_event:{user_feedback:{sentiment:s,user_input:{comment:i}}}})}#ie(){if(!this.#e)return;let e=this.#e.selectedContext;if(e instanceof g.NetworkAgent.RequestContext){let s=Ei.UIRequestLocation.UIRequestLocation.tab(e.getItem(),"headers-component");return F.Revealer.reveal(s)}if(e instanceof g.FileAgent.FileContext)return F.Revealer.reveal(e.getItem().uiLocation(0,0));if(e instanceof g.PerformanceAgent.PerformanceTraceContext){let s=e.getItem();if(s.callTree){let i=s.callTree.selectedNode?.event??s.callTree.rootNode.event,o=new u.TraceObject.RevealableEvent(i);return F.Revealer.reveal(o)}if(s.insight)return F.Revealer.reveal(s.insight)}}#oe(){this.#e?.setContext(null),this.requestUpdate()}#ne(){this.#e?.setContext(this.#L(this.#x())),this.requestUpdate()}#ae(){let e=!!R.Runtime.hostConfig.aidaAvailability?.enabled,s=!!R.Runtime.hostConfig.aidaAvailability?.blockedByAge,i=this.#v==="available",o=!!this.#r?.getIfNotDisabled();return e&&i&&o&&!s}async handleAction(e,s){if(this.#w&&!s?.prompt){this.#a.chatView?.focusTextInput();return}let i;switch(e){case"freestyler.elements-floating-button":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromElementsPanelFloatingButton),i="freestyler";break}case"freestyler.element-panel-context":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromElementsPanel),i="freestyler";break}case"drjones.network-floating-button":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanelFloatingButton),i="drjones-network-request";break}case"drjones.network-panel-context":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromNetworkPanel),i="drjones-network-request";break}case"drjones.performance-panel-context":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromPerformancePanelCallTree),i="drjones-performance-full";break}case"drjones.sources-floating-button":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanelFloatingButton),i="drjones-file";break}case"drjones.sources-panel-context":{w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceOpenedFromSourcesPanel),i="drjones-file";break}}if(!i)return;let o=this.#e;(!this.#e||this.#e.type!==i||this.#e.isEmpty)&&(o=new g.AiConversation.AiConversation({type:i,data:[],isReadOnly:!1,aidaClient:this.#t,changeManager:this.#i,isExternal:!1,performanceRecordAndReload:this.#S.bind(this),onInspectElement:this.#D.bind(this),networkTimeCalculator:me.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator(),lighthouseRecording:this.#T.bind(this)})),this.#y(o);let n=s?.prompt;if(n&&typeof n=="string"){if(!this.#ae())return;w.userMetrics.actionTaken(w.UserMetrics.Action.AiAssistanceQuerySubmitted),this.#e&&this.#e.isBlockedByOrigin&&this.#N(),await this.#j(n)}else this.#a.chatView?.focusTextInput()}#re(e){let s=g.AiHistoryStorage.AiHistoryStorage.instance().getHistory().map(o=>g.AiConversation.AiConversation.fromSerializedConversation(o));for(let o of s.reverse())o.isEmpty||!o.title||e.defaultSection().appendCheckboxItem(o.title,()=>{this.#de(o)},{checked:this.#e?.id===o.id,jslogContext:"freestyler.history-item"});let i=e.defaultSection().items.length===0;i&&e.defaultSection().appendItem(T(S.noPastConversations),()=>{},{disabled:!0}),e.footerSection().appendItem(T(S.clearChatHistory),()=>{g.AiHistoryStorage.AiHistoryStorage.instance().deleteAll()},{disabled:i})}#le(){this.#y()}#H(){this.#l.isExpanded=!1,this.#l.activeSidebarMessage=null,this.#l.inlineExpandedMessages=[]}#ce(){this.#e&&(this.#H(),g.AiHistoryStorage.AiHistoryStorage.instance().deleteHistoryEntry(this.#e.id),this.#y(),h.ARIAUtils.LiveAnnouncer.alert(T(S.chatDeleted)))}async#_(){if(this.#e)return await Yt(this.#e)}async#de(e){this.#e?.id!==e.id&&(this.#y(e),await this.#G(e.history))}#N(){this.#y(),this.#H(),h.ARIAUtils.LiveAnnouncer.alert(T(S.newChatCreated)),Xt.AnnotationRepository.annotationsEnabled()&&Xt.AnnotationRepository.instance().deleteAllAnnotations()}#z(){this.#C.abort(),this.#C=new AbortController}#L(e){switch(e){case"freestyler":return this.#c;case"drjones-file":return this.#p;case"drjones-network-request":return this.#h;case"drjones-performance-full":return this.#g;case"breakpoint":return this.#d;case"accessibility":return this.#u;case"none":case void 0:return null}}#he=e=>{e instanceof g.FileAgent.FileContext?this.#p=e:e instanceof g.StylingAgent.NodeContext?this.#c=e:e instanceof g.NetworkAgent.RequestContext?this.#h=e:e instanceof g.PerformanceAgent.PerformanceTraceContext?this.#g=e:e instanceof g.BreakpointDebuggerAgent.BreakpointContext?this.#d=e:e instanceof g.AccessibilityAgent.AccessibilityContext&&(this.#u=e),Ye.logFunctionCall(`context-change-${this.#e?.type}`),this.requestUpdate()};async#D(){if(!this.#o)return null;let e=new Promise(s=>{let i=r=>{r.data&&(s(kt(r.data)),n())},o=r=>{r.data||window.setTimeout(()=>{s(kt(h.Context.Context.instance().flavor(u.DOMModel.DOMNode))),n()},50)},n=()=>{h.Context.Context.instance().removeFlavorChangeListener(u.DOMModel.DOMNode,i),this.#o?.removeEventListener("Toggled",o)};h.Context.Context.instance().addFlavorChangeListener(u.DOMModel.DOMNode,i),this.#o?.addEventListener("Toggled",o),this.#C.signal.addEventListener("abort",()=>{s(null),n()},{once:!0})});this.#o.execute();try{return await e}finally{this.#o.toggled()&&this.#o.execute()}}async#j(e,s,i){if(!this.#e)return;this.#z();let o=this.#C.signal;this.#e.isEmpty&&St.UserBadges.instance().recordAction(St.BadgeAction.STARTED_AI_CONVERSATION);let n=pe.Prototypes.instance().isEnabled("emulationCapabilities"),r,c=this.#e.getPendingMultimodalInput();n&&c?r=c:Zt()&&s&&i&&(r={input:s,id:crypto.randomUUID(),type:i}),Ye.logFunctionCall(`start-conversation-${this.#e.type}`,"ui"),await this.#G(this.#e.run(e,{signal:o,multimodalInput:r}))}async#G(e){let s=await this.#m.acquire();try{let n=function(){let a=i.parts.at(-1);a?.type==="step"&&a.step===o||i.parts.push({type:"step",step:o})},i={entity:"model",parts:[]},o={isLoading:!0};this.#w=!0;let r=!1,c=!1;for await(let a of e){switch(o.requestApproval=void 0,a.type){case"user-query":{this.#f.push({entity:"user",text:a.query,imageInput:a.imageInput}),i={entity:"model",parts:[]},this.#f.push(i),(this.#l.isExpanded&&!this.#l.isInlined||pe.Prototypes.instance().isEnabled("breakpointDebuggerAgent")&&this.#e?.type==="breakpoint")&&this.#A(i);break}case"querying":{o={isLoading:!0},i.parts.length||n();break}case"context":{o.title=y(v.analyzingData),o.contextDetails=a.details,o.widgets=a.widgets,o.isLoading=!1,n();break}case"title":{o.title=a.title,n();break}case"thought":{o.isLoading=!1,o.thought=a.thought,n();break}case"suggestions":{let f=i.parts.at(-1);f?.type==="answer"?f.suggestions=a.suggestions:i.parts.push({type:"answer",text:"",suggestions:a.suggestions});break}case"side-effect":{o.isLoading=!1,o.code??=a.code,o.requestApproval={description:a.description,onAnswer:f=>{a.confirm(f),o.requestApproval=void 0,this.requestUpdate()}},n();break}case"action":{o.isLoading=!1,o.code??=a.code,o.output??=a.output,o.canceled=a.canceled,o.widgets??=a.widgets,n();break}case"answer":{i.rpcId=a.rpcId;let f=i.parts.at(-1);if(f?.type==="answer")f.text=a.text,a.suggestions&&(f.suggestions=a.suggestions);else{let x={type:"answer",text:a.text};a.suggestions&&(x.suggestions=a.suggestions),i.parts.push(x)}if(a.widgets&&R.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled&&i.parts.push({type:"widget",widgets:a.widgets}),i.parts.length>1){let x=i.parts[0];x.type==="step"&&x.step.isLoading&&!x.step.thought&&!x.step.code&&!x.step.contextDetails&&i.parts.shift()}o.isLoading=!1;break}case"error":{i.error=a.error;let f=i.parts.at(-1);if(f?.type==="step"){let x=f.step;a.error==="abort"?x.canceled=!0:x.isLoading&&i.parts.pop()}a.error==="block"&&i.parts.at(-1)?.type==="answer"&&i.parts.pop();break}case"context-change":{this.#he(a.context),o.isLoading=!1,o.widgets=a.widgets,n(),o={isLoading:!0};break}}if(!this.#e?.isReadOnly)switch(this.requestUpdate(),(a.type==="context"||a.type==="side-effect")&&this.#a.chatView?.scrollToBottom(),a.type){case"context":h.ARIAUtils.LiveAnnouncer.status(y(v.analyzingData));break;case"answer":!a.complete&&!r?(r=!0,h.ARIAUtils.LiveAnnouncer.status(y(v.answerLoading))):a.complete&&!c&&(c=!0,h.ARIAUtils.LiveAnnouncer.status(y(v.answerReady)))}}this.#w=!1,this.requestUpdate()}finally{s()}}};function _o(t){let e=["## AI"];for(let s of t.parts)if(s.type==="answer")e.push(`### Answer

${s.text}`);else if(s.type==="step"){let i=s.step;i.title&&e.push(`### ${i.title}`),i.contextDetails&&e.push(g.AiConversation.generateContextDetailsMarkdown(i.contextDetails)),i.thought&&e.push(i.thought),i.code&&e.push(`**Code executed:**
\`\`\`
${i.code.trim()}
\`\`\``),i.output&&e.push(`**Data returned:**
\`\`\`
${i.output}
\`\`\``)}return e.join(`

`)}var $i=class{handleAction(e,s,i){switch(s){case"freestyler.elements-floating-button":case"freestyler.element-panel-context":case"freestyler.main-menu":case"drjones.network-floating-button":case"drjones.network-panel-context":case"drjones.performance-panel-context":case"drjones.sources-floating-button":case"drjones.sources-panel-context":return(async()=>{let o=h.ViewManager.ViewManager.instance().view(Ct.panelName);if(!o)return;await h.ViewManager.ViewManager.instance().showView(Ct.panelName);let n=h.InspectorView.InspectorView.instance().totalSize()/4;h.InspectorView.InspectorView.instance().drawerSize()<n&&h.InspectorView.InspectorView.instance().setDrawerSize(n),(await o.widget()).handleAction(s,i)})(),!0}return!1}};function Go(){return Zt()&&!!R.Runtime.hostConfig.devToolsFreestyler?.multimodalUploadInput}function Zt(){return!!R.Runtime.hostConfig.devToolsFreestyler?.multimodal}function Se(){return!!R.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled}function Ko(){return!R.Runtime.hostConfig.aidaAvailability?.disallowLogging}export{Qe as AccessibilityAgentMarkdownRenderer,$i as ActionDelegate,Ct as AiAssistancePanel,Cs as ChatInput,Bs as ChatMessage,Oe as ChatView,ri as DisabledWidget,pi as ExploreWidget,Ci as ExportConversation,Qs as ExportForAgentsDialog,V as MarkdownRendererWithCodeBlock,fs as PatchWidget,Ui as SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW,Ze as SelectWorkspaceDialog,Rs as WalkthroughView,_o as getResponseMarkdown};
//# sourceMappingURL=ai_assistance.js.map
