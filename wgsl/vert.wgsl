struct Uniforms {
	projectionMat : mat4x4<f32>,
	viewMat : mat4x4<f32>,
	modelMat : mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> uni : Uniforms;

struct VertexOutput {
	@builtin(position) Position: vec4<f32>,
	@location(0) fragColor: vec4<f32>,
};

@vertex
fn main(
	@location(0) position: vec4<f32>,
	@location(1) color: vec4<f32>,
	@location(2) pos: vec3<f32>
) -> VertexOutput {
	var output : VertexOutput;
	output.Position = uni.projectionMat * uni.viewMat * uni.modelMat * (position + vec4<f32>(pos, 0.0));
	output.fragColor = color;
	return output;
}