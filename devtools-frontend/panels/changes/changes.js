var Y=Object.defineProperty;var u=(o,e)=>{for(var t in e)Y(o,t,{get:e[t],enumerable:!0})};var G={};u(G,{ChangesView:()=>k,DEFAULT_VIEW:()=>B});import"./../../ui/legacy/legacy.js";import*as I from"./../../core/i18n/i18n.js";import*as R from"./../../models/greendev/greendev.js";import*as A from"./../../models/workspace_diff/workspace_diff.js";import*as n from"./../../ui/legacy/legacy.js";import*as D from"./../../ui/lit/lit.js";import*as H from"./../../ui/visual_logging/visual_logging.js";import*as O from"./../common/common.js";var M={};u(M,{ChangesSidebar:()=>d,DEFAULT_VIEW:()=>F});import"./../../ui/kit/kit.js";import*as E from"./../../core/common/common.js";import*as y from"./../../core/i18n/i18n.js";import*as a from"./../../models/workspace/workspace.js";import"./../../models/workspace_diff/workspace_diff.js";import*as $ from"./../../ui/legacy/legacy.js";import*as Z from"./../../ui/lit/lit.js";import*as L from"./../../ui/visual_logging/visual_logging.js";import*as W from"./../snippets/snippets.js";var x=`@scope to (devtools-widget > *){.tree-outline li{min-height:20px}devtools-icon{color:var(--icon-file-default);margin-right:var(--sys-size-4)}.tree-element-title > div{display:flex;align-items:center}.navigator-sm-script-tree-item devtools-icon,
.navigator-script-tree-item devtools-icon,
.navigator-snippet-tree-item devtools-icon{color:var(--icon-file-script)}.navigator-sm-stylesheet-tree-item devtools-icon,
.navigator-stylesheet-tree-item devtools-icon{color:var(--icon-file-styles)}.navigator-image-tree-item devtools-icon{color:var(--icon-file-image)}.navigator-font-tree-item devtools-icon{color:var(--icon-file-font)}.tree-outline li:hover:not(.selected) .selection{display:block;& devtools-icon{color:var(--icon-default-hover)}}@media (forced-colors: active){li,
  devtools-icon{forced-color-adjust:none;color:ButtonText!important}}}
/*# sourceURL=${import.meta.resolve("./changesSidebar.css")} */`;var T={sFromSourceMap:"{PH1} (from source map)"},ee=y.i18n.registerUIStrings("panels/changes/ChangesSidebar.ts",T),te=y.i18n.getLocalizedString.bind(void 0,ee),{render:ie,html:g}=Z,F=(o,e,t)=>{let i=s=>s.contentType().isFromSourceMap()?te(T.sFromSourceMap,{PH1:s.displayName()}):s.url(),r=s=>W.ScriptSnippetFileSystem.isSnippetsUISourceCode(s)?"snippet":"document";ie(g`<devtools-tree
             navigation-variant
             hide-overflow .template=${g`
               <ul role="tree">
                 ${o.sourceCodes.values().map(s=>g`
                   <li
                     role="treeitem"
                     @select=${()=>o.onSelect(s)}
                     ?selected=${s===o.selectedSourceCode}>
                       <style>${x}</style>
                       <div class=${"navigator-"+s.contentType().name()+"-tree-item"}>
                         <devtools-icon name=${r(s)}></devtools-icon>
                         <span title=${i(s)}>
                           <span ?hidden=${!s.isDirty()}>*</span>
                           ${s.displayName()}
                         </span>
                       </div>
                   </li>`)}
               </ul>`}></devtools-tree>`,t)},d=class extends E.ObjectWrapper.eventMixin($.Widget.Widget){#i=null;#e;#t=new Set;#s=null;constructor(e,t=F){super(e,{jslog:`${L.pane("sidebar").track({resize:!0})}`}),this.#e=t}set workspaceDiff(e){this.#i&&(this.#i.modifiedUISourceCodes().forEach(this.#n.bind(this)),this.#i.removeEventListener("ModifiedStatusChanged",this.uiSourceCodeModifiedStatusChanged,this)),this.#i=e,this.#i.modifiedUISourceCodes().forEach(this.#r.bind(this)),this.#i.addEventListener("ModifiedStatusChanged",this.uiSourceCodeModifiedStatusChanged,this),this.requestUpdate()}selectedUISourceCode(){return this.#s}performUpdate(){let e={onSelect:t=>this.#o(t),sourceCodes:this.#t,selectedSourceCode:this.#s};this.#e(e,{},this.contentElement)}#o(e){this.#s=e,this.dispatchEventToListeners("SelectedUISourceCodeChanged"),this.requestUpdate()}#r(e){this.#t.add(e),e.addEventListener(a.UISourceCode.Events.TitleChanged,this.requestUpdate,this),e.addEventListener(a.UISourceCode.Events.WorkingCopyChanged,this.requestUpdate,this),e.addEventListener(a.UISourceCode.Events.WorkingCopyCommitted,this.requestUpdate,this),this.requestUpdate()}#n(e){if(e.removeEventListener(a.UISourceCode.Events.TitleChanged,this.requestUpdate,this),e.removeEventListener(a.UISourceCode.Events.WorkingCopyChanged,this.requestUpdate,this),e.removeEventListener(a.UISourceCode.Events.WorkingCopyCommitted,this.requestUpdate,this),e===this.#s){let t;for(let i of this.#t.values()){if(i===e)break;t=i}this.#t.delete(e),this.#o(t??this.#t.values().next().value??null)}else this.#t.delete(e);this.requestUpdate()}uiSourceCodeModifiedStatusChanged(e){let{isModified:t,uiSourceCode:i}=e.data;t?this.#r(i):this.#n(i),this.requestUpdate()}};var z=`[slot="main"]{flex-direction:column;display:flex}[slot="sidebar"]{overflow:auto}.diff-container{flex:1;overflow:auto;& .widget:first-child{height:100%}.combined-diff-view{padding-inline:var(--sys-size-6);padding-block:var(--sys-size-4)}}:focus.selected{background-color:var(--sys-color-tonal-container);color:var(--sys-color-on-tonal-container)}.changes-toolbar{background-color:var(--sys-color-cdt-base-container);border-top:1px solid var(--sys-color-divider)}[hidden]{display:none!important}.copy-to-prompt{margin:var(--sys-size-4);flex-grow:0!important}
/*# sourceURL=${import.meta.resolve("./changesView.css")} */`;var S={};u(S,{CombinedDiffView:()=>c});import"./../../ui/kit/kit.js";import*as q from"./../../core/common/common.js";import*as C from"./../../core/i18n/i18n.js";import*as m from"./../../models/persistence/persistence.js";import"./../../models/workspace_diff/workspace_diff.js";import"./../../ui/components/buttons/buttons.js";import*as h from"./../../ui/legacy/legacy.js";import*as p from"./../../ui/lit/lit.js";import*as P from"./../../ui/visual_logging/visual_logging.js";import*as N from"./../utils/utils.js";var V=`.combined-diff-view{display:flex;flex-direction:column;gap:var(--sys-size-5);height:100%;background-color:var(--sys-color-surface3);overflow:auto;details{flex-shrink:0;border-radius:12px;&.selected{outline:var(--sys-size-2) solid var(--sys-color-divider-on-tonal-container)}summary{background-color:var(--sys-color-surface1);border-radius:var(--sys-shape-corner-medium-small);height:var(--sys-size-12);padding:var(--sys-size-3);font:var(--sys-typescale-body5-bold);display:flex;justify-content:space-between;gap:var(--sys-size-2);&:focus-visible{outline:var(--sys-size-2) solid var(--sys-color-state-focus-ring);outline-offset:calc(-1 * var(--sys-size-2))}.summary-left{display:flex;align-items:center;min-width:0;flex-grow:0;.file-name-link{margin-left:var(--sys-size-5);width:100%;text-overflow:ellipsis;overflow:hidden;text-wrap-mode:nowrap;border:none;background:none;font:inherit;padding:0;&:hover{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer}&:focus-visible{outline:var(--sys-size-2) solid var(--sys-color-state-focus-ring);outline-offset:var(--sys-size-2)}}devtools-icon{transform:rotate(270deg)}devtools-file-source-icon{height:var(--sys-size-8);width:var(--sys-size-8);flex-shrink:0}}.summary-right{flex-shrink:0;display:flex;align-items:center;gap:var(--sys-size-2);padding-right:var(--sys-size-4);.copied{font:var(--sys-typescale-body5-regular)}}&::marker{content:''}}.diff-view-container{overflow-x:auto;background-color:var(--sys-color-cdt-base-container);border-bottom-left-radius:var(--sys-shape-corner-medium-small);border-bottom-right-radius:var(--sys-shape-corner-medium-small)}&[open]{summary{border-radius:0;border-top-left-radius:var(--sys-shape-corner-medium-small);border-top-right-radius:var(--sys-shape-corner-medium-small);devtools-icon{transform:rotate(0deg)}}}}}
/*# sourceURL=${import.meta.resolve("./combinedDiffView.css")} */`;var se=1e3,{html:w,Directives:{classMap:oe}}=p,f={copied:"Copied to clipboard",copyFile:"Copy file {PH1} to clipboard"},re=C.i18n.registerUIStrings("panels/changes/CombinedDiffView.ts",f),U=C.i18n.getLocalizedString.bind(void 0,re);function ne(o){let{fileName:e,fileUrl:t,mimeType:i,icon:r,diff:s,copied:l,selectedFileUrl:X,onCopy:J,onFileNameClick:K}=o,Q=oe({selected:X===t});return w`
    <details open class=${Q}>
      <summary>
        <div class="summary-left">
          <devtools-icon class="drop-down-icon" name="arrow-drop-down"></devtools-icon>
          ${r}
          <button class="file-name-link" jslog=${P.action("jump-to-file")} @click=${()=>K(t)}>${e}</button>
        </div>
        <div class="summary-right">
          <devtools-button
            .title=${U(f.copyFile,{PH1:e})}
            .size=${"SMALL"}
            .iconName=${"copy"}
            .jslogContext=${"combined-diff-view.copy"}
            .variant=${"icon"}
            @click=${()=>J(t)}
          ></devtools-button>
          ${l?w`<span class="copied">${U(f.copied)}</span>`:p.nothing}
        </div>
      </summary>
      <div class="diff-view-container">
        <devtools-diff-view
          .data=${{diff:s,mimeType:i}}>
        </devtools-diff-view>
      </div>
    </details>
  `}var ae=(o,e,t)=>{p.render(w`
      <div class="combined-diff-view">
        ${o.singleDiffViewInputs.map(i=>ne(i))}
      </div>
    `,t)},c=class extends h.Widget.Widget{ignoredUrls=[];#i;#e;#t=[];#s={};#o;#r={};constructor(e,t=ae){super(e),this.registerRequiredCSS(V),this.#o=t}wasShown(){super.wasShown(),this.#e?.addEventListener("ModifiedStatusChanged",this.#d,this),this.#a()}willHide(){super.willHide(),this.#e?.removeEventListener("ModifiedStatusChanged",this.#d,this)}set workspaceDiff(e){this.#e=e,this.#a()}set selectedFileUrl(e){this.#i=e,this.requestUpdate(),this.updateComplete.then(()=>{this.#r.scrollToSelectedDiff?.()})}async#n(e){let t=this.#t.find(r=>r.url()===e);if(!t)return;let i=t.workingCopyContentData();i.isTextContent&&(h.UIUtils.copyTextToClipboard(i.text,U(f.copied)),this.#s[e]=!0,this.requestUpdate(),setTimeout(()=>{delete this.#s[e],this.requestUpdate()},se))}#l(e){let t=this.#t.find(i=>i.url()===e);q.Revealer.reveal(t)}async#a(){if(!this.#e)return;let e=this.#t,t=this.#e.modifiedUISourceCodes();e.filter(s=>!t.includes(s)).forEach(s=>this.#e?.unsubscribeFromDiffChange(s,this.requestUpdate,this)),t.filter(s=>!e.includes(s)).forEach(s=>this.#e?.subscribeToDiffChange(s,this.requestUpdate,this)),this.#t=t,this.isShowing()&&this.requestUpdate()}async#d(){this.#e&&await this.#a()}async performUpdate(){let t=(await Promise.all(this.#t.map(async i=>{for(let s of this.ignoredUrls)if(i.url().startsWith(s))return;return{diff:(await this.#e?.requestDiff(i))?.diff??[],uiSourceCode:i}}))).filter(i=>!!i).map(({uiSourceCode:i,diff:r})=>{let s=i.fullDisplayName(),l=m.Persistence.PersistenceImpl.instance().fileSystem(i);return l&&(s=[l.project().displayName(),...m.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(l)].join("/")),{diff:r,fileName:`${i.isDirty()?"*":""}${s}`,fileUrl:i.url(),mimeType:i.mimeType(),icon:N.PanelUtils.getIconForSourceFile(i),copied:this.#s[i.url()],selectedFileUrl:this.#i,onCopy:this.#n.bind(this),onFileNameClick:this.#l.bind(this)}});this.#o({singleDiffViewInputs:t},this.#r,this.contentElement)}};var de="https://developer.chrome.com/docs/devtools/changes",b={noChanges:"No changes yet",changesViewDescription:"On this page you can track code changes made within DevTools."},le=I.i18n.registerUIStrings("panels/changes/ChangesView.ts",b),_=I.i18n.getLocalizedString.bind(void 0,le),{render:ce,html:j}=D,{widget:v}=n.Widget,B=(o,e,t)=>{let i=s=>{s.addEventListener("SelectedUISourceCodeChanged",()=>o.onSelect(s.selectedUISourceCode()))},r=R.Prototypes.instance().isEnabled("copyToGemini");ce(j`
      <style>${z}</style>
      <devtools-split-view direction=column>
        <div class=vbox slot="main">
          <devtools-widget
            ?hidden=${o.workspaceDiff.modifiedUISourceCodes().length>0}
            ${v(n.EmptyWidget.EmptyWidget,{header:_(b.noChanges),text:_(b.changesViewDescription),link:de})}>
          </devtools-widget>
          <div class=diff-container role=tabpanel ?hidden=${o.workspaceDiff.modifiedUISourceCodes().length===0}>
            ${v(c,{selectedFileUrl:o.selectedSourceCode?.url(),workspaceDiff:o.workspaceDiff})}
          </div>
          ${r?j`
            <devtools-widget class="copy-to-prompt"
              ${v(O.CopyChangesToPrompt,{workspaceDiff:o.workspaceDiff,patchAgentCSSChange:null})}
            ></devtools-widget>
          `:D.nothing}
        </div>
        <devtools-widget slot="sidebar" ${v(d,{workspaceDiff:o.workspaceDiff})}
          ${n.Widget.widgetRef(d,i)}>
        </devtools-widget>
      </devtools-split-view>`,t)},k=class o extends n.Widget.VBox{#i;#e=null;#t;constructor(e,t=B){super(e,{jslog:`${H.panel("changes").track({resize:!0})}`,useShadowDom:!0}),this.#i=A.WorkspaceDiff.workspaceDiff(),this.#t=t,this.requestUpdate()}performUpdate(){this.#t({workspaceDiff:this.#i,selectedSourceCode:this.#e,onSelect:e=>{this.#e=e,this.requestUpdate()}},{},this.contentElement)}wasShown(){n.Context.Context.instance().setFlavor(o,this),super.wasShown(),this.requestUpdate(),this.#i.addEventListener("ModifiedStatusChanged",this.requestUpdate,this)}willHide(){super.willHide(),n.Context.Context.instance().setFlavor(o,null),this.#i.removeEventListener("ModifiedStatusChanged",this.requestUpdate,this)}};export{M as ChangesSidebar,G as ChangesView,S as CombinedDiffView};
//# sourceMappingURL=changes.js.map
