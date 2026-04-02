import*as t from"./../../../../core/sdk/sdk.js";import*as r from"./../../legacy.js";var e;async function o(){return e||(e=await import("./object_ui.js")),e}r.UIUtils.registerRenderer({contextTypes(){return[t.RemoteObject.RemoteObject]},async loadRenderer(){return(await o()).ObjectPropertiesSection.Renderer.instance()}});
//# sourceMappingURL=object_ui-meta.js.map
