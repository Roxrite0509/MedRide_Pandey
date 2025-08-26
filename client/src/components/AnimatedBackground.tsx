import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const AnimatedBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();
  const spiralRef = useRef<THREE.Group>();
  const gridRef = useRef<THREE.Group>();
  const heartRef = useRef<THREE.Group>();
  const [webglSupported, setWebglSupported] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const mouseRef = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!mountRef.current) return;

    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // White background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Create dotted grid
    const gridGroup = new THREE.Group();
    const gridMaterial = new THREE.PointsMaterial({
      color: 0xff0000, // Red color
      size: 0.02,
      transparent: true,
      opacity: 0.6
    });

    const gridGeometry = new THREE.BufferGeometry();
    const gridPoints = [];
    const gridSize = 20;
    const gridSpacing = 0.5;

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        gridPoints.push(i * gridSpacing, j * gridSpacing, -2);
      }
    }

    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
    const grid = new THREE.Points(gridGeometry, gridMaterial);
    gridGroup.add(grid);
    gridRef.current = gridGroup;
    scene.add(gridGroup);

    // Create wave pattern using the mathematical equation from the image
    const heartGroup = new THREE.Group();
    
    // Create multiple wave outlines with different frequencies
    const waveCount = 6;
    const aValues = [2.5, 3.75, 5.0, 6.25, 7.5, 9.105]; // Different 'a' values for varying frequencies (reduced by half)
    
    for (let i = 0; i < waveCount; i++) {
      const points = [];
      const segments = 200;
      const a = aValues[i];
      
      // Using the equation: x^(2/3) + 0.9 * (3.3 - x^2)^(1/2) * sin(a * π * x) = y
      // We'll parametrize this for x from -1.8 to 1.8
      for (let j = 0; j <= segments; j++) {
        const x = -1.8 + (j / segments) * 3.6; // x range from -1.8 to 1.8
        
        // Calculate the wave equation
        const xSquared = x * x;
        if (xSquared <= 3.3) { // Ensure we don't get negative values under square root
          const xTerm = Math.pow(Math.abs(x), 2/3) * Math.sign(x); // x^(2/3) with proper sign
          const sqrtTerm = Math.sqrt(3.3 - xSquared);
          const sinTerm = Math.sin(a * Math.PI * x);
          
          // Calculate y using the corrected equation
          const y = xTerm + 0.9 * sqrtTerm * sinTerm;
          
          points.push(new THREE.Vector3(x * 0.5, y * 0.5, i * 0.02));
        }
      }
      
      const waveGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const waveMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8 - (i * 0.12),
        linewidth: 2
      });
      
      const waveLine = new THREE.Line(waveGeometry, waveMaterial);
      heartGroup.add(waveLine);
    }
    
    // Position heart in top left
    heartGroup.position.set(-3, 2, 0);
    heartRef.current = heartGroup;
    scene.add(heartGroup);

    // Create spiral circles - hover state
    const spiralGroup = new THREE.Group();
    
    // Create multiple circles for spiral effect
    const circleCount = 8;
    const radius = 2.5;
    
    for (let i = 0; i < circleCount; i++) {
      const circleGeometry = new THREE.RingGeometry(radius + i * 0.12, radius + i * 0.12 + 0.025, 64);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0, // Start hidden
        side: THREE.DoubleSide
      });
      
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.position.z = i * 0.08;
      spiralGroup.add(circle);
    }
    
    // Position spiral in top left (same as heart)
    spiralGroup.position.set(-3, 2, 0);
    spiralRef.current = spiralGroup;
    scene.add(spiralGroup);

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Check if mouse is near top left area where heart/spiral is positioned
      const topLeftX = -3; // Heart position
      const topLeftY = 2;
      
      // Convert mouse position to world coordinates
      const worldX = mouseRef.current.x * 5; // Adjust scale based on camera distance
      const worldY = mouseRef.current.y * 5;
      
      const distance = Math.sqrt((worldX - topLeftX) ** 2 + (worldY - topLeftY) ** 2);
      setIsHovering(distance < 1.5);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // Animate heart and spiral transition
      if (spiralRef.current && heartRef.current) {
        if (isHovering) {
          // Transition to spiral
          heartRef.current.children.forEach((child, index) => {
            const line = child as THREE.Line;
            if (line.material instanceof THREE.LineBasicMaterial) {
              line.material.opacity = Math.max(0, line.material.opacity - 0.08);
            }
          });
          
          spiralRef.current.children.forEach((child, index) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const targetOpacity = 0.8 - (index * 0.1);
              mesh.material.opacity = Math.min(targetOpacity, mesh.material.opacity + 0.08);
            }
          });
          
          // Rotate spiral
          spiralRef.current.rotation.z += 0.015;
          // Add breathing effect to spiral
          const scale = 1 + Math.sin(time * 3) * 0.1;
          spiralRef.current.scale.set(scale, scale, 1);
        } else {
          // Transition back to heart (default state)
          spiralRef.current.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.opacity = Math.max(0, mesh.material.opacity - 0.08);
            }
          });
          
          heartRef.current.children.forEach((child, index) => {
            const line = child as THREE.Line;
            if (line.material instanceof THREE.LineBasicMaterial) {
              const targetOpacity = 0.8 - (index * 0.12);
              line.material.opacity = Math.min(targetOpacity, line.material.opacity + 0.08);
            }
          });
          
          // Beating heart effect with varying scales for each outline
          heartRef.current.children.forEach((child, index) => {
            const beatOffset = index * 0.3; // Different timing for each outline
            const beatScale = 1 + Math.sin((time * 6) + beatOffset) * (0.15 - index * 0.02);
            const randomOffset = Math.sin((time * 4) + index) * 0.05;
            child.scale.set(beatScale + randomOffset, beatScale + randomOffset, 1);
          });
        }
      }

      // Subtle grid animation
      if (gridRef.current) {
        gridRef.current.rotation.z += 0.002;
        const opacity = 0.6 + Math.sin(time) * 0.2;
        const gridMesh = gridRef.current.children[0] as THREE.Points;
        if (gridMesh.material instanceof THREE.PointsMaterial) {
          gridMesh.material.opacity = opacity;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of Three.js objects
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material?.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, []);

  if (!webglSupported) {
    return (
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}
      />
    );
  }

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 -z-10"
      style={{ 
        width: '100vw', 
        height: '100vh',
        overflow: 'hidden'
      }}
    />
  );
};

export default AnimatedBackground;