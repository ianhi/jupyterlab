// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { DisposableDelegate } from '@lumino/disposable';

import { Widget } from '@lumino/widgets';

/**
 * A class for rendering a video document.
 */
export class RenderedVideo extends Widget implements IRenderMime.IRenderer {
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.addClass('jp-VideoViewer');
    this._video = document.createElement('video');
    this._video.controls=true;
    this.node.appendChild(this._video);
    this._mimeType = options.mimeType;
  }

  /**
   * Render video into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    let data = model.data[this._mimeType] as string | undefined;
    if (
      !data ||
      (data.length === this._base64.length && data === this._base64)
    ) {
      // If there is no data, or if the string has not changed, we do not
      // need to re-parse the data and rerender.
      return Promise.resolve(void 0);
    }
    this._base64 = data;
    const blob = Private.b64toBlob(data, this._mimeType);


    // Release reference to any previous object url.
    if (this._disposable) {
      this._disposable.dispose();
    }
    let objectUrl = URL.createObjectURL(blob);
    if (model.metadata.fragment) {
      objectUrl += model.metadata.fragment;
    }
    this._video.src = objectUrl;
    
    // Set the disposable release the object URL.
    this._disposable = new DisposableDelegate(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        /* no-op */
      }
    });
    return;
  }

  /**
   * Dispose of the resources held by the video widget.
   */
  dispose() {
    if (this._disposable) {
      this._disposable.dispose();
    }
    super.dispose();
  }

  private _base64 = '';
  private _disposable: DisposableDelegate | null = null;
  private _video: HTMLVideoElement;
  private _mimeType: string;
}

/**
 * A mime renderer factory for video data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  defaultRank: 5,
  createRenderer: options => new RenderedVideo(options)
};

const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    id: '@jupyterlab/video-extension:factory',
    rendererFactory,
    dataType: 'string',
    documentWidgetFactoryOptions: {
      name: 'Video Viewer',
      modelName: 'base64',
      primaryFileType: 'mp4',
      fileTypes: ['mp4', 'webm', 'ogg'],
      defaultFor: ['mp4', 'webm', 'ogg']
    }
  }
];

export default extensions;

/**
 * A namespace for video widget private data.
 */
namespace Private {
  /**
   * Convert a base64 encoded string to a Blob object.
   * Modified from a snippet found here:
   * https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
   *
   * @param b64Data - The base64 encoded data.
   *
   * @param contentType - The mime type of the data.
   *
   * @param sliceSize - The size to chunk the data into for processing.
   *
   * @returns a Blob for the data.
   */
  export function b64toBlob(
    b64Data: string,
    contentType: string = '',
    sliceSize: number = 512
  ): Blob {
    const byteCharacters = atob(b64Data);
    let byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);

      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      let byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }
}
