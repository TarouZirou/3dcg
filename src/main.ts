const canvas: HTMLCanvasElement = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 640;
canvas.height = 640;

export const ctx = canvas.getContext("webgpu") as GPUCanvasContext;

export const g_adapter = await navigator.gpu.requestAdapter(); //物理デバイス
export const g_device = await g_adapter!.requestDevice(); //論理デバイス
export const fragWGSL: string = await fetch("./wgsl/frag.wgsl").then((r) =>
	r.text()
);
export const vertWGSL: string = await fetch("./wgsl/vert.wgsl").then((r) =>
	r.text()
);

export const presentationFormat = navigator.gpu.getPreferredCanvasFormat(); //contextの設定

const quadVertexSize = 4 * 8;
const quadPositionOffset = 0;
const quadColorOffset = 4 * 4;
const quadVertexCount = 6;

//Contextの設定
ctx.configure({
	device: g_device,
	format: presentationFormat,
	alphaMode: "opaque",
});

//Render Pipeline
const pipeline: GPURenderPipeline = g_device.createRenderPipeline({
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

function frame({
	ctx,
	pipeline,
}: {
	ctx: GPUCanvasContext;
	pipeline: GPURenderPipeline;
}) {
	const cmdEncoder = g_device.createCommandEncoder();
	const textureView = ctx.getCurrentTexture();
	const renderPassDesc: GPURenderPassDescriptor = {
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

//四角形の頂点データ
/* prettier-ignore */
const QuadVertexArray = new Float32Array([
	// x, y, z, w, r, g, b, a
	-1, 1, 0, 1, 0, 1, 0, 1,
	-1, -1, 0, 1, 0, 0, 0, 1,
	1, -1, 0, 1, 1, 0, 0, 1,
	-1, 1, 0, 1, 0, 1, 0, 1,
	1, -1, 0, 1, 1, 0, 0, 1,
	1, 1, 0, 1, 1, 1, 0, 1,
]);

const quadVertexBuffer = g_device.createBuffer({
	size: QuadVertexArray.byteLength,
	usage: GPUBufferUsage.VERTEX,
	mappedAtCreation: true,
});

new Float32Array(quadVertexBuffer.getMappedRange()).set(QuadVertexArray);
quadVertexBuffer.unmap();

function quadFrame({
	ctx,
	pipeline,
}: {
	ctx: GPUCanvasContext;
	pipeline: GPURenderPipeline;
}) {
	const cmdEncoder = g_device.createCommandEncoder();
	const textureView = ctx.getCurrentTexture();
	const renderPassDesc: GPURenderPassDescriptor = {
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
	passEncoder.setVertexBuffer(0, quadVertexBuffer);
	passEncoder.draw(quadVertexCount, 1, 0, 0);
	passEncoder.end();
	g_device.queue.submit([cmdEncoder.finish()]);
}

quadFrame({ ctx, pipeline });
