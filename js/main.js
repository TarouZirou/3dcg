const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 640;
canvas.height = 640;
export const ctx = canvas.getContext("webgpu");
export const g_adapter = await navigator.gpu.requestAdapter(); //物理デバイス
export const g_device = await g_adapter.requestDevice(); //論理デバイス
export const fragWGSL = await fetch("./wgsl/frag.wgsl").then((r) => r.text());
export const vertWGSL = await fetch("./wgsl/vert.wgsl").then((r) => r.text());
export const presentationFormat = navigator.gpu.getPreferredCanvasFormat(); //contextの設定
const quadVertexSize = 4 * 8;
const quadPositionOffset = 0;
const quadColorOffset = 4 * 4;
const quadVertexCount = 6;
//四角形の頂点データ
/* prettier-ignore */
const QuadVertexArray = new Float32Array([
    // x, y, z, w, r, g, b, a
    -1, 1, 0, 1, 0, 1, 0, 1,
    -1, -1, 0, 1, 0, 0, 0, 1,
    1, -1, 0, 1, 1, 0, 0, 1,
    1, 1, 0, 1, 1, 1, 0, 1,
]);
const quadIndicesBuffer = g_device.createBuffer({
    size: QuadVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
});
new Float32Array(quadIndicesBuffer.getMappedRange()).set(QuadVertexArray);
quadIndicesBuffer.unmap();
//Contextの設定
ctx.configure({
    device: g_device,
    format: presentationFormat,
    alphaMode: "opaque",
});
const quadIndexArray = new Uint16Array([0, 1, 2, 0, 2, 3]);
const indicesBuffer = g_device.createBuffer({
    size: quadIndexArray.byteLength,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
});
new Uint16Array(indicesBuffer.getMappedRange()).set(quadIndexArray);
indicesBuffer.unmap();
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
                        offset: quadColorOffset, // バッファの先頭からのオフセット
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
});
function frame({ ctx, pipeline, }) {
    const cmdEncoder = g_device.createCommandEncoder();
    const textureView = ctx.getCurrentTexture();
    const renderPassDesc = {
        colorAttachments: [
            {
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store",
            },
        ],
    };
    const passEncoder = cmdEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();
    g_device.queue.submit([cmdEncoder.finish()]);
}
function quadFrame({ ctx, pipeline, }) {
    const cmdEncoder = g_device.createCommandEncoder();
    const textureView = ctx.getCurrentTexture();
    const renderPassDesc = {
        colorAttachments: [
            {
                view: textureView,
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store",
            },
        ],
    };
    const passEncoder = cmdEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, quadIndicesBuffer);
    passEncoder.setIndexBuffer(indicesBuffer, "uint16");
    passEncoder.drawIndexed(quadIndexArray.length, 1, 0, 0, 0);
    passEncoder.end();
    g_device.queue.submit([cmdEncoder.finish()]);
}
quadFrame({ ctx, pipeline });
