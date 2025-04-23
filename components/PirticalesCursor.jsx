'use client';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function ThreeJSParticlesCursor() {
	const containerRef = useRef(null);
	const mousePositionRef = useRef({ x: 0, y: 0 });
	const sceneRef = useRef(null);
	const cameraRef = useRef(null);
	const rendererRef = useRef(null);
	const particlesRef = useRef(null);
	const animationFrameRef = useRef(null);
	const particleSystemRef = useRef(null);
	const mouseVector3Ref = useRef(new THREE.Vector3());
	const lastEmitTimeRef = useRef(0);

	// Initialize Three.js scene
	useEffect(() => {
		if (!containerRef.current) return;

		// Setup scene, camera, and renderer
		const scene = new THREE.Scene();
		sceneRef.current = scene;

		const camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		camera.position.z = 5;
		cameraRef.current = camera;

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0x000000, 0);
		containerRef.current.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		// Handle window resize
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		// Create particles
		createParticles();

		// Animation loop
		const animate = () => {
			updateMousePosition();
			updateParticles();
			renderer.render(scene, camera);
			animationFrameRef.current = requestAnimationFrame(animate);
		};

		animate();

		// Cleanup
		return () => {
			if (containerRef.current && renderer.domElement) {
				containerRef.current.removeChild(renderer.domElement);
			}
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(animationFrameRef.current);
			disposeParticles();
		};
	}, []);

	// Track mouse position
	useEffect(() => {
		const handleMouseMove = (event) => {
			mousePositionRef.current = {
				x: event.clientX,
				y: event.clientY
			};
		};

		window.addEventListener('mousemove', handleMouseMove);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
		};
	}, []);

	// Convert screen mouse position to 3D space
	const updateMousePosition = () => {
		if (!cameraRef.current) return;

		// Convert to normalized device coordinates (-1 to +1)
		const normalizedX = (mousePositionRef.current.x / window.innerWidth) * 2 - 1;
		const normalizedY = -(mousePositionRef.current.y / window.innerHeight) * 2 + 1;

		// Create a vector for the mouse position
		const vector = new THREE.Vector3(normalizedX, normalizedY, 0.5);

		// Convert to world coordinates
		vector.unproject(cameraRef.current);

		// Set direction from camera position to mouse position
		const dir = vector.sub(cameraRef.current.position).normalize();

		// Find intersection with z=0 plane
		const distance = -cameraRef.current.position.z / dir.z;
		const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));

		// Store the result
		mouseVector3Ref.current = pos;
	};

	// Create particle system
	const createParticles = () => {
		if (!sceneRef.current) return;

		// Dispose existing particles if any
		disposeParticles();

		// Particle count
		const particleCount = 1500;

		// Particle geometry
		const particleGeometry = new THREE.BufferGeometry();

		// Create arrays for position, velocity, color, size, and lifetime
		const positions = new Float32Array(particleCount * 3);
		const velocities = new Float32Array(particleCount * 3);
		const colors = new Float32Array(particleCount * 3);
		const sizes = new Float32Array(particleCount);
		const lifetimes = new Float32Array(particleCount);
		const maxLifetimes = new Float32Array(particleCount);
		const seeds = new Float32Array(particleCount);

		// Initialize particles
		for (let i = 0; i < particleCount; i++) {
			// Initial positions far away
			positions[i * 3] = 1000;   // Far off-screen
			positions[i * 3 + 1] = 1000;
			positions[i * 3 + 2] = 0;

			// Random velocities (will be reset on spawn)
			velocities[i * 3] = 0;
			velocities[i * 3 + 1] = 0;
			velocities[i * 3 + 2] = 0;

			// Random colors with more vibrant hues
			const hue = Math.random();
			const saturation = 0.7 + Math.random() * 0.3; // High saturation
			const lightness = 0.5 + Math.random() * 0.3; // Bright

			const color = new THREE.Color().setHSL(hue, saturation, lightness);
			colors[i * 3] = color.r;
			colors[i * 3 + 1] = color.g;
			colors[i * 3 + 2] = color.b;

			// Small sizes for more delicate particles
			sizes[i] = 0.02 + Math.random() * 0.08;

			// Lifetimes
			lifetimes[i] = 0; // Inactive initially
			maxLifetimes[i] = 0.5 + Math.random() * 1.5; // 0.5-2 seconds

			// Random seed for variations
			seeds[i] = Math.random();
		}

		// Set attributes
		particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

		// Custom shader material
		const particleMaterial = new THREE.ShaderMaterial({
			vertexShader: `
        attribute float size;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
			fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          if (alpha < 0.05) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			transparent: true,
			vertexColors: true
		});

		// Create point cloud
		const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
		sceneRef.current.add(particleSystem);

		// Store references for updating
		particlesRef.current = {
			positions,
			velocities,
			colors,
			sizes,
			lifetimes,
			maxLifetimes,
			seeds,
			geometry: particleGeometry
		};

		particleSystemRef.current = particleSystem;
	};

	// Clean up particles
	const disposeParticles = () => {
		if (particleSystemRef.current && sceneRef.current) {
			if (particleSystemRef.current.geometry) {
				particleSystemRef.current.geometry.dispose();
			}
			if (particleSystemRef.current.material) {
				particleSystemRef.current.material.dispose();
			}
			sceneRef.current.remove(particleSystemRef.current);
		}
	};

	// Update particles in animation loop
	const updateParticles = () => {
		if (!particlesRef.current || !particleSystemRef.current || !cameraRef.current) return;

		const {
			positions,
			velocities,
			lifetimes,
			maxLifetimes,
			seeds,
			geometry
		} = particlesRef.current;

		const currentTime = performance.now();
		const deltaTime = Math.min(1/30, (currentTime - lastEmitTimeRef.current) / 1000);
		lastEmitTimeRef.current = currentTime;

		// Emission control
		const shouldEmit = true; // Always emit particles
		const emitCount = 10; // Particles per frame
		let emitted = 0;

		// Update each particle
		for (let i = 0; i < positions.length / 3; i++) {
			// If particle is active, update it
			if (lifetimes[i] > 0) {
				// Apply velocity to position
				positions[i * 3] += velocities[i * 3] * deltaTime * 60;
				positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime * 60;
				positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime * 60;

				// Apply slight turbulence based on seed
				positions[i * 3] += Math.sin(currentTime * 0.001 + seeds[i] * 100) * 0.0005;
				positions[i * 3 + 1] += Math.cos(currentTime * 0.001 + seeds[i] * 100) * 0.0005;

				// Apply slight gravity and friction
				velocities[i * 3] *= 0.98;
				velocities[i * 3 + 1] *= 0.98;
				velocities[i * 3 + 2] *= 0.98;
				velocities[i * 3 + 1] -= 0.0002; // Slight gravity

				// Decrease lifetime
				lifetimes[i] -= deltaTime;

				// Update size based on lifetime
				const normalizedLife = Math.max(0, lifetimes[i] / maxLifetimes[i]);
				const sizeAttribute = geometry.attributes.size;
				// Particles shrink as they age
				sizeAttribute.array[i] = (0.02 + seeds[i] * 0.08) * normalizedLife * (1 + Math.sin(currentTime * 0.005 + seeds[i] * 10) * 0.1);
				sizeAttribute.needsUpdate = true;
			}
			// If inactive, check if we should spawn it
			else if (shouldEmit && emitted < emitCount) {
				// Reset position to mouse position with small random offset
				positions[i * 3] = mouseVector3Ref.current.x + (Math.random() - 0.5) * 0.05;
				positions[i * 3 + 1] = mouseVector3Ref.current.y + (Math.random() - 0.5) * 0.05;
				positions[i * 3 + 2] = mouseVector3Ref.current.z + (Math.random() - 0.5) * 0.05;

				// Set velocity in a starburst pattern
				const angle = Math.random() * Math.PI * 2;
				const speed = 0.01 + Math.random() * 0.05;
				velocities[i * 3] = Math.cos(angle) * speed;
				velocities[i * 3 + 1] = Math.sin(angle) * speed;
				velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

				// Reset lifetime
				lifetimes[i] = maxLifetimes[i];

				emitted++;
			}
		}

		// Update geometry
		geometry.attributes.position.needsUpdate = true;
	};

	return (
		<div ref={containerRef} className="fixed inset-0 pointer-events-none overflow-hidden" />
	);
}