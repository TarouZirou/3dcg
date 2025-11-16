const canvas: HTMLCanvasElement = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

frame({ ctx, pipeline });
