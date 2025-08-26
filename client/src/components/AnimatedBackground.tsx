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

    // Create cardioid (heart shape) - default state
    const heartGroup = new THREE.Group();
    
    // Create multiple heart outlines for beating effect
    const heartCount = 6;
    for (let i = 0; i < heartCount; i++) {
      // Cardioid parametric equation: r = a(1 - cos(θ))
      const points = [];
      const segments = 100;
      const scale = 0.8 + i * 0.15;
      
      for (let j = 0; j <= segments; j++) {
        const t = (j / segments) * Math.PI * 2;
        const r = scale * (1 - Math.cos(t));
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        points.push(new THREE.Vector3(x, y, i * 0.02));
      }
      
      const heartGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const heartMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8 - (i * 0.12),
        linewidth: 2
      });
      
      const heartLine = new THREE.Line(heartGeometry, heartMaterial);
      heartLine.rotation.x = Math.PI; // Flip to correct orientation
      heartGroup.add(heartLine);
    }
    
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
    
    spiralRef.current = spiralGroup;
    scene.add(spiralGroup);

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Check if mouse is near center (login area)
      const distance = Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2);
      setIsHovering(distance < 0.5);
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