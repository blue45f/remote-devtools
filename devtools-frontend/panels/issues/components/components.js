var v=Object.defineProperty;var r=(s,e)=>{for(var t in e)v(s,t,{get:e[t],enumerable:!0})};var c={};r(c,{ElementsPanelLink:()=>o});import{html as f,render as I}from"./../../../ui/lit/lit.js";import*as m from"./../../../ui/visual_logging/visual_logging.js";var a=`.element-reveal-icon{display:inline-block;width:20px;height:20px;mask-image:var(--image-file-select-element);background-color:var(--icon-default)}
/*# sourceURL=${import.meta.resolve("././elementsPanelLink.css")} */`;var o=class extends HTMLElement{#o=this.attachShadow({mode:"open"});#e=()=>{};#t=()=>{};#n=()=>{};set data(e){this.#e=e.onElementRevealIconClick,this.#t=e.onElementRevealIconMouseEnter,this.#n=e.onElementRevealIconMouseLeave,this.#s()}#s(){this.#i()}#i(){I(f`
      <style>${a}</style>
      <span
        class="element-reveal-icon"
        jslog=${m.link("elements-panel").track({click:!0})}
        @click=${this.#e}
        @mouseenter=${this.#t}
        @mouseleave=${this.#n}></span>
      `,this.#o,{host:this})}};customElements.define("devtools-elements-panel-link",o);var g={};r(g,{HideIssuesMenu:()=>n});import*as u from"./../../../core/common/common.js";import*as i from"./../../../core/i18n/i18n.js";import"./../../../ui/components/buttons/buttons.js";import*as p from"./../../../ui/legacy/legacy.js";import{html as x,render as k}from"./../../../ui/lit/lit.js";var d=`.hide-issues-menu-btn{position:relative;display:flex;background-color:transparent;flex:none;align-items:center;justify-content:center;padding:0;margin:0 -2px 0 4px;overflow:hidden;border-radius:0;border:none;&:hover > devtools-icon{color:var(--icon-default-hover)}}
/*# sourceURL=${import.meta.resolve("././hideIssuesMenu.css")} */`;var h={tooltipTitle:"Hide issues"},y=i.i18n.registerUIStrings("panels/issues/components/HideIssuesMenu.ts",h),b=i.i18n.getLocalizedString.bind(void 0,y),n=class extends HTMLElement{#o=this.attachShadow({mode:"open"});#e=u.UIString.LocalizedEmptyString;#t=()=>{};set data(e){this.#e=e.menuItemLabel,this.#t=e.menuItemAction,this.#n()}onMenuOpen(e){e.stopPropagation();let t=this.#o.querySelector("devtools-button"),l=new p.ContextMenu.ContextMenu(e,{x:t?.getBoundingClientRect().left,y:t?.getBoundingClientRect().bottom});l.headerSection().appendItem(this.#e,()=>this.#t(),{jslogContext:"toggle-similar-issues"}),l.show()}onKeydown(e){(e.key==="Enter"||e.key==="Space")&&e.stopImmediatePropagation()}#n(){k(x`
    <style>${d}</style>
    <devtools-button
      .data=${{variant:"icon",iconName:"dots-vertical",title:b(h.tooltipTitle)}}
      .jslogContext=${"hide-issues"}
      class="hide-issues-menu-btn"
      @click=${this.onMenuOpen}
      @keydown=${this.onKeydown}></devtools-button>
    `,this.#o,{host:this})}};customElements.define("devtools-hide-issues-menu",n);export{c as ElementsPanelLink,g as HideIssuesMenu};
//# sourceMappingURL=components.js.map
