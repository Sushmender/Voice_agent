import { Renderer, Program, Mesh, Triangle, Vec3 } from 'ogl';

try {
    console.log("Creating renderer");
    const renderer = new Renderer();
    const gl = renderer.gl;
    console.log("Renderer created", gl.canvas.width);
    
    const geometry = new Triangle(gl);
    const program  = new Program(gl, {
        vertex: `void main() {}`,
        fragment: `void main() {}`,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, 1) }
        }
    });
    const mesh = new Mesh(gl, { geometry, program });
    console.log("Success");
} catch(e) {
    console.error("Error!", e);
}
