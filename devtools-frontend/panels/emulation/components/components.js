var h=Object.defineProperty;var c=(i,e)=>{for(var t in e)h(i,t,{get:e[t],enumerable:!0})};var d={};c(d,{SizeInputElement:()=>a});import*as s from"./../../../models/emulation/emulation.js";import*as n from"./../../../ui/legacy/legacy.js";import{html as u,render as m}from"./../../../ui/lit/lit.js";import*as l from"./../../../ui/visual_logging/visual_logging.js";var o=class i extends Event{size;static eventName="sizechanged";constructor(e){super(i.eventName),this.size=e}};function r(i){return Number(i.target.value)}var a=class extends HTMLElement{#a=this.attachShadow({mode:"open"});#e=!1;#t="0";#i="";#s;#o;constructor(e,{jslogContext:t}){super(),this.#s=e,this.#o=t}connectedCallback(){this.render()}set disabled(e){this.#e=e,this.render()}set size(e){this.#t=e,this.render()}set placeholder(e){this.#i=e,this.render()}render(){m(u`
      <style>
        input {
          /*
           * 4 characters for the maximum size of the value,
           * 2 characters for the width of the step-buttons,
           * 2 pixels padding between the characters and the
           * step-buttons.
           */
          width: calc(4ch + 2ch + 2px);
          max-height: 18px;
          border: var(--sys-color-neutral-outline);
          border-radius: 4px;
          margin: 0 2px;
          text-align: center;
          font-size: inherit;
          font-family: inherit;
        }

        input:disabled {
          user-select: none;
        }

        input:focus::-webkit-input-placeholder {
          color: transparent;
        }
      </style>
      <input type="number"
             max=${s.DeviceModeModel.MaxDeviceSize}
             min=${s.DeviceModeModel.MinDeviceSize}
             jslog=${l.textField().track({change:!0}).context(this.#o)}
             maxlength="4"
             title=${this.#s}
             placeholder=${this.#i}
             ?disabled=${this.#e}
             .value=${this.#t}
             @change=${this.#r}
             @keydown=${this.#n} />
    `,this.#a,{host:this})}#r(e){this.dispatchEvent(new o(r(e)))}#n(e){let t=n.UIUtils.modifiedFloatNumber(r(e),e);t!==null&&(t=Math.min(t,s.DeviceModeModel.MaxDeviceSize),t=Math.max(t,s.DeviceModeModel.MinDeviceSize),e.preventDefault(),e.target.value=String(t),this.dispatchEvent(new o(t)))}};customElements.define("device-mode-emulation-size-input",a);export{d as DeviceSizeInputElement};
//# sourceMappingURL=components.js.map
