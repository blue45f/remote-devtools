var p=Object.defineProperty;var h=(r,e)=>{for(var t in e)p(r,t,{get:e[t],enumerable:!0})};var d={};h(d,{ExpandableList:()=>o});import*as i from"./../../lit/lit.js";import*as l from"./../../visual_logging/visual_logging.js";var n=`:host{overflow:hidden}div{line-height:1.7em}.arrow-icon-button{cursor:pointer;padding:1px 0;border:none;background:none;margin-right:2px}.arrow-icon{display:inline-block;mask-image:var(--image-file-triangle-right);background-color:var(--icon-default);margin-top:2px;height:14px;width:14px;transition:transform 200ms}.arrow-icon.expanded{transform:rotate(90deg)}.expandable-list-container{display:flex;margin-top:4px}.expandable-list-items{overflow:hidden}.link,
.devtools-link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px;border:none;background:none;font-family:inherit;font-size:var(--sys-size-6);&:focus-visible{outline:2px solid var(--sys-color-state-focus-ring);outline-offset:0;border-radius:var(--sys-shape-corner-extra-small)}}button.link{border:none;background:none;font-family:inherit;font-size:inherit}.text-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/*# sourceURL=${import.meta.resolve("./expandableList.css")} */`;var{html:s,Directives:{ifDefined:a}}=i,o=class extends HTMLElement{#s=this.attachShadow({mode:"open"});#e=!1;#i=[];#t;set data(e){this.#i=e.rows,this.#t=e.title,this.#o()}#r(){this.#e=!this.#e,this.#o()}#o(){this.#i.length<1||i.render(s`
      <style>${n}</style>
      <div class="expandable-list-container">
        <div>
          ${this.#i.length>1?s`
              <button title=${a(this.#t)} aria-label=${a(this.#t)} aria-expanded=${this.#e?"true":"false"} @click=${()=>this.#r()} class="arrow-icon-button">
                <span class="arrow-icon ${this.#e?"expanded":""}"
                jslog=${l.expand().track({click:!0})}></span>
              </button>
            `:i.nothing}
        </div>
        <div class="expandable-list-items">
          ${this.#i.filter((e,t)=>this.#e||t===0).map(e=>s`
            ${e}
          `)}
        </div>
      </div>
    `,this.#s,{host:this})}};customElements.define("devtools-expandable-list",o);export{d as ExpandableList};
//# sourceMappingURL=expandable_list.js.map
