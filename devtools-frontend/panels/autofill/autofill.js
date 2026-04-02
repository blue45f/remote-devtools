var C=Object.defineProperty;var D=(s,l)=>{for(var n in l)C(s,n,{get:l[n],enumerable:!0})};var L={};D(L,{AutofillView:()=>S,i18nString:()=>t});import"./../../ui/kit/kit.js";import"./../../ui/components/adorners/adorners.js";import"./../../ui/legacy/components/data_grid/data_grid.js";import*as A from"./../../core/common/common.js";import*as g from"./../../core/host/host.js";import*as M from"./../../core/i18n/i18n.js";import*as h from"./../../core/sdk/sdk.js";import*as U from"./../../models/autofill_manager/autofill_manager.js";import*as d from"./../../ui/legacy/legacy.js";import*as f from"./../../ui/lit/lit.js";import*as u from"./../../ui/visual_logging/visual_logging.js";var w=`@scope to (devtools-widget > *){main{height:100%}.header{display:flex;border-bottom:1px solid var(--sys-color-divider);width:100%}.placeholder-container{height:calc(100% - 29px);display:flex;justify-content:center;align-items:center}.address{padding:10px;margin-right:auto}.filled-fields-grid{border-top:1px solid var(--sys-color-divider);box-sizing:border-box}.content-container{display:flex;flex-flow:column;height:100%}.grid-wrapper{flex-grow:1}devtools-data-grid{border:none;height:100%}.checkbox-label{display:flex;align-items:center}.right-to-left{border-bottom:1px solid var(--sys-color-divider);display:flex;flex-flow:row-reverse wrap;justify-content:flex-end}.label-container{padding:5px;display:flex;align-items:flex-start}.top-left-corner{border-bottom:1px solid var(--sys-color-divider);display:flex;padding:5px;gap:10px}.matches-filled-field{background-color:var(--sys-color-tonal-container)}.highlighted{background-color:var(--sys-color-state-focus-select)}.link{color:var(--sys-color-primary);text-decoration-line:underline}.feedback{margin:auto 5px auto auto;font-size:var(--sys-typescale-body4-size)}}
/*# sourceURL=${import.meta.resolve("./autofillView.css")} */`;var{html:a,render:k,Directives:{styleMap:R}}=f,{FillingStrategy:N}=Protocol.Autofill,{bindToSetting:p}=d.UIUtils,e={noAutofill:"No autofill detected",toStartDebugging:"To start debugging autofill, use Chrome's autofill menu to fill an address form.",value:"Value",predictedAutofillValue:"Predicted autofill value",formField:"Form field",autocompleteAttribute:"Autocomplete attribute",attr:"attr",inferredByHeuristics:"Inferred by heuristics",heur:"heur",autoShow:"Automatically open this panel",showTestAddressesInAutofillMenu:"Show test addresses in autofill menu",autoShowTooltip:"Open the autofill panel automatically when an autofill activity is detected.",addressPreview:"Address preview",formInspector:"Form inspector",learnMore:"Learn more",sendFeedback:"Send feedback"},E="https://goo.gle/devtools-autofill-panel",T="https://crbug.com/329106326",P=M.i18n.registerUIStrings("panels/autofill/AutofillView.ts",e),t=M.i18n.getLocalizedString.bind(void 0,P),O=(s,l,n)=>{let v=()=>{let m=(o,$)=>{let x=s.address.substring(o,$).split(`
`),F=x.map((c,H)=>H===x.length-1?c:a`${c}<br>`),I=s.matches.some(c=>c.startIndex<=o&&c.endIndex>o);if(!I)return a`<span>${F}</span>`;let V=f.Directives.classMap({"matches-filled-field":I,highlighted:s.highlightedMatches.some(c=>c.startIndex<=o&&c.endIndex>o)});return a`
        <span class=${V}
              jslog=${u.item("matched-address-item").track({hover:!0,resize:!0})}
              @mouseenter=${()=>s.onHighlightMatchesInAddress(o)}
              @mouseleave=${s.onClearHighlightedMatches}>
          ${F}
        </span>`},i=[],r=new Set([0,s.address.length]);for(let o of s.matches)r.add(o.startIndex),r.add(o.endIndex);let y=Array.from(r).sort((o,$)=>o-$);for(let o=0;o<y.length-1;o++)i.push(m(y[o],y[o+1]));return a`
      <div class="address">
        ${i}
      </div>
    `},b=()=>{let m=new Set(s.highlightedMatches.map(i=>i.filledFieldIndex));return a`
      <div class="grid-wrapper" role="region" aria-label=${t(e.formInspector)}>
        <devtools-data-grid striped
                            class="filled-fields-grid">
          <table>
            <tr>
              <th id="name" weight="50" sortable>${t(e.formField)}</th>
              <th id="autofill-type" weight="50" sortable>${t(e.predictedAutofillValue)}</th>
              <th id="value" weight="50" sortable>${t(e.value)}</th>
            </tr>
            ${s.filledFields.map((i,r)=>a`
                <tr style=${R({"font-family":"var(--monospace-font-family)","font-size":"var(--monospace-font-size)","background-color":m.has(r)?"var(--sys-color-state-hover-on-subtle)":null})}
                    @mouseenter=${()=>s.onHighlightMatchesInFilledFiels(r)}
                    @mouseleave=${s.onClearHighlightedMatches}>
                  <td>${i.name||`#${i.id}`} (${i.htmlType})</td>
                  <td>
                      ${i.autofillType}
                      ${i.fillingStrategy==="autocompleteAttribute"?a`<devtools-adorner .name=${i.fillingStrategy} title=${t(e.autocompleteAttribute)}>
                              <span>${t(e.attr)}</span>
                            </devtools-adorner>`:i.fillingStrategy==="autofillInferred"?a`<devtools-adorner .name=${i.fillingStrategy} title=${t(e.inferredByHeuristics)}>
                              <span>${t(e.heur)}</span>
                            </devtools-adorner>`:f.nothing}
                  </td>
                  <td>"${i.value}"</td>
                </tr>`)}
          </table>
        </devtools-data-grid>
      </div>
    `};if(!s.address&&!s.filledFields.length){k(a`
        <style>${w}</style>
        <style>${d.inspectorCommonStyles}</style>
        <main>
          <div class="top-left-corner">
            <devtools-checkbox
                ${p(s.showTestAddressesInAutofillMenuSetting)}
                title=${t(e.showTestAddressesInAutofillMenu)}>
              ${t(e.showTestAddressesInAutofillMenu)}
            </devtools-checkbox>
            <devtools-checkbox
                ${p(s.autoOpenViewSetting)}
                title=${t(e.autoShowTooltip)}>
              ${t(e.autoShow)}
            </devtools-checkbox>
            <devtools-link href=${T} class="feedback link" jslogcontext="feedback">${t(e.sendFeedback)}</devtools-link>
          </div>
          <div class="placeholder-container" jslog=${u.pane("autofill-empty")}>
            <div class="empty-state">
              <span class="empty-state-header">${t(e.noAutofill)}</span>
              <div class="empty-state-description">
                <span>${t(e.toStartDebugging)}</span>
                <devtools-link href=${E} class="link" jslogcontext="learn-more">${t(e.learnMore)}</devtools-link>
              </div>
            </div>
          </div>
        </main>
      `,n);return}k(a`
      <style>${w}</style>
      <style>${d.inspectorCommonStyles}</style>
      <main>
        <div class="content-container" jslog=${u.pane("autofill")}>
          <div class="right-to-left" role="region" aria-label=${t(e.addressPreview)}>
            <div class="header">
              <div class="label-container">
                <devtools-checkbox
                    ${p(s.showTestAddressesInAutofillMenuSetting)}
                    title=${t(e.showTestAddressesInAutofillMenu)}>
                  ${t(e.showTestAddressesInAutofillMenu)}
                </devtools-checkbox>
              </div>
              <div class="label-container">
                <devtools-checkbox
                    ${p(s.autoOpenViewSetting)}
                    title=${t(e.autoShowTooltip)}>
                  ${t(e.autoShow)}
                </devtools-checkbox>
              </div>
              <devtools-link href=${T} class="feedback link" jslogcontext="feedback">${t(e.sendFeedback)}</devtools-link>
            </div>
            ${v()}
          </div>
          ${b()}
        </div>
      </main>
    `,n)},S=class extends d.Widget.VBox{#l;#e;#r=A.Settings.Settings.instance().createSetting("auto-open-autofill-view-on-event",!0);#a;#o="";#i=[];#t=[];#s=[];constructor(l=U.AutofillManager.AutofillManager.instance(),n=O){super({useShadowDom:!0}),this.#e=l,this.#l=n,this.#a=A.Settings.Settings.instance().createSetting("show-test-addresses-in-autofill-menu-on-event",!1)}wasShown(){super.wasShown();let l=this.#e.getLastFilledAddressForm();l&&({address:this.#o,filledFields:this.#i,matches:this.#t}=l),this.#e.addEventListener("AddressFormFilled",this.#d,this),h.TargetManager.TargetManager.instance().addModelListener(h.ResourceTreeModel.ResourceTreeModel,h.ResourceTreeModel.Events.PrimaryPageChanged,this.#n,this),this.requestUpdate()}willHide(){h.TargetManager.TargetManager.instance().removeModelListener(h.ResourceTreeModel.ResourceTreeModel,h.ResourceTreeModel.Events.PrimaryPageChanged,this.#n,this),this.#e.removeEventListener("AddressFormFilled",this.#d,this),super.willHide()}#n(){this.#o="",this.#i=[],this.#t=[],this.#s=[],this.requestUpdate()}async#d({data:l}){this.#r.get()?(await d.ViewManager.ViewManager.instance().showView("autofill-view"),g.userMetrics.actionTaken(g.UserMetrics.Action.AutofillReceivedAndTabAutoOpened)):g.userMetrics.actionTaken(g.UserMetrics.Action.AutofillReceived),this.#o=l.address,this.#i=l.filledFields,this.#t=l.matches,this.#s=[],this.requestUpdate()}performUpdate(){let l=i=>{this.#s=this.#t.filter(r=>r.startIndex<=i&&r.endIndex>i),this.requestUpdate()},n=i=>{this.#e.highlightFilledField(this.#i[i]),this.#s=this.#t.filter(r=>r.filledFieldIndex===i),this.requestUpdate()},v=()=>{this.#e.clearHighlightedFilledFields(),this.#s=[],this.requestUpdate()},b={autoOpenViewSetting:this.#r,showTestAddressesInAutofillMenuSetting:this.#a,address:this.#o,filledFields:this.#i,matches:this.#t,highlightedMatches:this.#s,onHighlightMatchesInAddress:l,onHighlightMatchesInFilledFiels:n,onClearHighlightedMatches:v};this.#l(b,void 0,this.contentElement)}};export{L as AutofillView};
//# sourceMappingURL=autofill.js.map
