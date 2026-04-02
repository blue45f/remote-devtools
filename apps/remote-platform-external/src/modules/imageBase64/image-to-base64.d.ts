declare module "image-to-base64" {
  function imageToBase64(url: string): Promise<string>;
  export default imageToBase64;
}
