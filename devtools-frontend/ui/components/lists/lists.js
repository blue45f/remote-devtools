var g=Object.defineProperty;var p=(r,t)=>{for(var s in t)g(r,s,{get:t[s],enumerable:!0})};var m={};p(m,{ItemEditEvent:()=>a,ItemRemoveEvent:()=>d,List:()=>c});import*as u from"./../../../core/i18n/i18n.js";import{Directives as f,html as n,nothing as v,render as x}from"./../../lit/lit.js";import"./../buttons/buttons.js";var h=`:host{width:100%;flex:auto 0 1;overflow-y:auto;flex-direction:column;--override-background-list-item-color:var(--sys-color-cdt-base-container)}:host([hidden]){display:none}ul{list-style:none;margin:0;padding:0}li{flex:none;min-height:30px;display:flex;align-items:center;position:relative;overflow:hidden;border-radius:var(--sys-shape-corner-extra-small);&:hover{.controls-gradient{background-image:linear-gradient(90deg,transparent,var(--sys-color-cdt-base-container))}.controls-buttons{visibility:visible}}&:focus-within:not(:active),
  &:focus-visible{background-color:var(--sys-color-state-hover-on-subtle);--override-background-list-item-color:hsl(0deg 0% 96%);outline:none;.controls-gradient{background-image:linear-gradient(90deg,transparent,var(--override-background-list-item-color))}.controls-buttons{background-color:var(--override-background-list-item-color);visibility:visible}}}.controls-container{display:flex;flex-direction:row;justify-content:flex-end;align-items:stretch;pointer-events:none;position:absolute;right:0}.controls-gradient{width:var(--sys-size-16)}.controls-buttons{flex:none;display:flex;flex-direction:row;align-items:center;pointer-events:auto;visibility:hidden;background-color:var(--sys-color-cdt-base-container)}
/*# sourceURL=${import.meta.resolve("./list.css")} */`;var o={edit:"Edit",remove:"Remove"},$=u.i18n.registerUIStrings("ui/components/lists/List.ts",o),l=u.i18n.getLocalizedString.bind(void 0,$),a=class extends CustomEvent{constructor(t){super("edit",{bubbles:!0,composed:!0,detail:t})}},d=class extends CustomEvent{constructor(t){super("delete",{bubbles:!0,composed:!0,detail:t})}},c=class extends HTMLElement{static observedAttributes=["editable","deletable","disable-li-focus"];#e;#i=!1;#s=!1;#o;constructor(){super(),this.attachShadow({mode:"open"}),this.#e=new MutationObserver(this.#t.bind(this))}set editable(t){this.#i!==t&&(this.#i=t,this.#t())}set deletable(t){this.#s!==t&&(this.#s=t,this.#t())}set disableListItemFocus(t){this.#o!==t&&(this.#o=t,this.#t())}attributeChangedCallback(t,s,e){let i=e!==null;t==="editable"?this.editable=i:t==="deletable"?this.deletable=i:t==="disable-li-focus"&&(this.disableListItemFocus=i)}connectedCallback(){this.#e.observe(this,{childList:!0}),this.#t()}disconnectedCallback(){this.#e.disconnect()}createSlottedListItem(t){return n`
    <li role='listitem' tabindex=${this.#o?"-1":"0"}>
    <slot name='slot-${t}'></slot>
    <div class='controls-container'>
              <div class='controls-gradient'></div>
              <div class='controls-buttons'>
                ${this.#i?n`
            <devtools-button
              title=${l(o.edit)}
              aria-label=${l(o.edit)}
              .iconName=${"edit"}
              .jslogContext=${"edit-item"}
              .variant=${"icon"}
              @click=${this.#n.bind(this,t)}
            ></devtools-button>
          `:v}
                ${this.#s?n`
            <devtools-button
              title=${l(o.remove)}
              aria-label=${l(o.remove)}
              .iconName=${"bin"}
              .jslogContext=${"remove-item"}
              .variant=${"icon"}
              @click=${this.#r.bind(this,t)}
            ></devtools-button>
          `:v}
              </div>
            </div>
            </li>`}#t(){if(this.shadowRoot){let s=[...this.children].map((e,i)=>{let b=`slot-${i}`;return e.getAttribute("slot")!==b&&e.setAttribute("slot",b),{index:i,item:e}});x(n`
    <style>${h}</style>
    <ul role='list'>
    ${f.repeat(s,e=>e.item,e=>this.createSlottedListItem(e.index))}
    </ul>
  `,this.shadowRoot)}}#r(t){this.dispatchEvent(new d({index:t}))}#n(t){this.dispatchEvent(new a({index:t}))}};customElements.define("devtools-list",c);export{m as List};
//# sourceMappingURL=lists.js.map
