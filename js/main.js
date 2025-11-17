import { mat4, vec3, } from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js";
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 640;
canvas.height = 640;
export const ctx = canvas.getContext("webgpu");
export const g_adapter = await navigator.gpu.requestAdapter(); //物理デバイス
export const g_device = await g_adapter.requestDevice(); //論理デバイス
//シェーダーコードの読み込み
export const fragWGSL = await fetch("./wgsl/frag.wgsl").then((r) => r.text());
export const vertWGSL = await fetch("./wgsl/vert.wgsl").then((r) => r.text());
export const presentationFormat = navigator.gpu.getPreferredCanvasFormat(); // カラーテクスチャのフォーマット
// ------------------------------------
//頂点データ関連定数
const quadVertexSize = 4 * 8;
const quadPositionOffset = 0;
const cubeColorOffset = 4 * 4;
//立方体の頂点データ
/* prettier-ignore */
const CubeVertexArray = new Float32Array([
    // x, y, z, w, r, g, b, a
    -1, 1, -1, 1, 0, 1, 0, 1,
    -1, -1, -1, 1, 0, 0, 0, 1,
    1, -1, -1, 1, 1, 0, 0, 1,
    1, 1, -1, 1, 1, 1, 0, 1,
    -1, 1, 1, 1, 1, 0, 1, 1,
    -1, -1, 1, 1, 1, 1, 1, 1,
    1, -1, 1, 1, 0, 1, 1, 1,
    1, 1, 1, 1, 0, 0, 1, 1,
]);
//立方体の頂点バッファ
const CubeVertexBuffer = g_device.createBuffer({
    size: CubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
});
new Float32Array(CubeVertexBuffer.getMappedRange()).set(CubeVertexArray); // バッファにデータを書き込む
CubeVertexBuffer.unmap(); // バッファのマッピングを解除
//Contextの設定
ctx.configure({
    device: g_device,
    format: presentationFormat, // カラーテクスチャのフォーマット
    alphaMode: "opaque", // 透過設定
});
//インデックスバッファ
/* prettier-ignore */
const cubeIndexArray = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    0, 4, 7, 0, 7, 3,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    0, 1, 5, 0, 5, 4
]);
const indicesBuffer = g_device.createBuffer({
    size: cubeIndexArray.byteLength, // バイトサイズ
    usage: GPUBufferUsage.INDEX, // インデックスバッファとして使用する
    mappedAtCreation: true, // 作成時にマッピングする
});
new Uint16Array(indicesBuffer.getMappedRange()).set(cubeIndexArray);
indicesBuffer.unmap();
// ------------------------------------
const uniBufferSize = 4 * 16 * 3; // 4バイト * 16要素(4x4行列) * 3行列
const uniBuffer = g_device.createBuffer({
    size: uniBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
function getTransformationMatrix(uniformBuffer) {
    const projectionMat = mat4.create();
    const viewMat = mat4.create();
    const modelMat = mat4.create();
    mat4.perspective(projectionMat, (2 * Math.PI) / 5, 1, 0.1, 100.0);
    mat4.translate(viewMat, viewMat, vec3.fromValues(0, 0, -4));
    const now = Date.now() / 1000;
    mat4.rotate(modelMat, modelMat, 1, vec3.fromValues(Math.sin(now), Math.cos(now), 0));
    // Wrap the mat4 (number[]) into Float32Array before writing to the GPU buffer
    g_device.queue.writeBuffer(uniformBuffer, 4 * 16 * 0, new Float32Array(projectionMat));
    g_device.queue.writeBuffer(uniformBuffer, 4 * 16 * 1, new Float32Array(viewMat));
    g_device.queue.writeBuffer(uniformBuffer, 4 * 16 * 2, new Float32Array(modelMat));
}
//Render Pipeline
const pipeline = g_device.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: g_device.createShaderModule({
            code: vertWGSL,
        }),
        entryPoint: "main",
        buffers: [
            {
                arrayStride: quadVertexSize, // 1頂点あたりのバイト数
                attributes: [
                    {
                        // position
                        shaderLocation: 0, // location(0)
                        offset: quadPositionOffset, // バッファの先頭からのオフセット
                        format: "float32x4",
                    },
                    {
                        // color
                        shaderLocation: 1, // location(1)
                        offset: cubeColorOffset, // バッファの先頭からのオフセット
                        format: "float32x4",
                    },
                ],
            },
        ],
    },
    fragment: {
        module: g_device.createShaderModule({
            code: fragWGSL,
        }),
        entryPoint: "main",
        targets: [
            {
                // location(0)
                format: presentationFormat,
            },
        ],
    },
    primitive: {
        topology: "triangle-list",
    },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
    },
});
const uniBindGroup = g_device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0, // @binding(0) in shader
            resource: {
                buffer: uniBuffer,
            },
        },
    ],
});
function quadFrame({ ctx, pipeline, }) {
    const cmdEncoder = g_device.createCommandEncoder();
    const textureView = ctx.getCurrentTexture();
    // create a depth texture that matches the pipeline's depth format
    const depthTexture = g_device.createTexture({
        size: [canvas.width, canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const renderPassDesc = {
        colorAttachments: [
            {
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store",
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: "clear",
            depthClearValue: 1.0,
            depthStoreOp: "store",
        },
    };
    const passEncoder = cmdEncoder.beginRenderPass(renderPassDesc);
    getTransformationMatrix(uniBuffer);
    passEncoder.setPipeline(pipeline); //パイプライン設定
    passEncoder.setVertexBuffer(0, CubeVertexBuffer); //頂点バッファ設定
    passEncoder.setIndexBuffer(indicesBuffer, "uint16"); //インデックスバッファ設定
    passEncoder.setBindGroup(0, uniBindGroup); // バインドグループを設定
    passEncoder.drawIndexed(cubeIndexArray.length, 1, 0, 0, 0); //描画コマンド
    passEncoder.end(); //レンダーパス終了
    g_device.queue.submit([cmdEncoder.finish()]); //コマンド送信
    requestAnimationFrame(() => {
        quadFrame({ ctx, pipeline });
    });
}
quadFrame({ ctx, pipeline });
