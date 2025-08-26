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

    // Create spiral circle
    const spiralGroup = new THREE.Group();
    
    // Create multiple circles for spiral effect
    const circleCount = 10;
    const radius = 3.5; // Expanded radius
    
    for (let i = 0; i < circleCount; i++) {
      const circleGeometry = new THREE.RingGeometry(radius + i * 0.15, radius + i * 0.15 + 0.03, 64);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Red color
        transparent: true,
        opacity: 0.8 - (i * 0.08),
        side: THREE.DoubleSide
      });
      
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.position.z = i * 0.1;
      spiralGroup.add(circle);
    }
    
    spiralRef.current = spiralGroup;
    scene.add(spiralGroup);

    // Create heart shape
    const heartGroup = new THREE.Group();
    
    // Heart shape using curves
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x + 25, y + 25);
    heartShape.bezierCurveTo(x + 25, y + 25, x + 20, y, x, y);
    heartShape.bezierCurveTo(x - 30, y, x - 30, y + 35, x - 30, y + 35);
    heartShape.bezierCurveTo(x - 30, y + 55, x - 10, y + 77, x + 25, y + 95);
    heartShape.bezierCurveTo(x + 60, y + 77, x + 80, y + 55, x + 80, y + 35);
    heartShape.bezierCurveTo(x + 80, y + 35, x + 80, y, x + 50, y);
    heartShape.bezierCurveTo(x + 35, y, x + 25, y + 25, x + 25, y + 25);

    const heartGeometry = new THREE.ShapeGeometry(heartShape);
    const heartMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    
    const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
    heartMesh.scale.set(0.02, 0.02, 0.02);
    heartMesh.position.set(0, 0, 0);
    heartGroup.add(heartMesh);
    
    heartRef.current = heartGroup;
    scene.add(heartGroup);

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

      // Animate spiral and heart transition
      if (spiralRef.current && heartRef.current) {
        if (isHovering) {
          // Transition to heart
          spiralRef.current.children.forEach((child, index) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.opacity = Math.max(0, mesh.material.opacity - 0.05);
            }
          });
          
          const heartMesh = heartRef.current.children[0] as THREE.Mesh;
          if (heartMesh.material instanceof THREE.MeshBasicMaterial) {
            heartMesh.material.opacity = Math.min(0.9, heartMesh.material.opacity + 0.05);
            // Beating effect
            const beatScale = 1 + Math.sin(time * 8) * 0.2;
            heartRef.current.scale.set(beatScale, beatScale, 1);
          }
        } else {
          // Transition back to spiral
          heartRef.current.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.opacity = Math.max(0, mesh.material.opacity - 0.05);
            }
          });
          
          spiralRef.current.children.forEach((child, index) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const targetOpacity = 0.8 - (index * 0.08);
              mesh.material.opacity = Math.min(targetOpacity, mesh.material.opacity + 0.05);
            }
          });
          
          // Rotate spiral
          spiralRef.current.rotation.z += 0.01;
          // Add subtle breathing effect
          const scale = 1 + Math.sin(time * 2) * 0.1;
          spiralRef.current.scale.set(scale, scale, 1);
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