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

    // Scene setup (transparent background so DOM card can show canvas underneath)
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Optimized renderer setup for performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: window.devicePixelRatio <= 1, // disable antialias on high DPI for performance
      alpha: true, // IMPORTANT: makes canvas transparent
      powerPreference: 'default' // use default instead of high-performance for battery life
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap pixel ratio for performance
    renderer.setClearColor(0x000000, 0); // fully transparent clear color
    rendererRef.current = renderer;

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Optimized grid - reduce size for better performance
    const gridGroup = new THREE.Group();
    const gridSize = 15; // reduced from 20 to 15
    const gridSpacing = 0.5;

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        // Create plus symbol using two perpendicular lines
        const plusGroup = new THREE.Group();
        
        // Horizontal line
        const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.02, 0, 0),
          new THREE.Vector3(0.02, 0, 0)
        ]);
        const softColor = 0xff0000; // stark red
        const baseOpacity = 0.9; // more visible red gradient
        const hLineMaterial = new THREE.LineBasicMaterial({
          color: softColor,
          transparent: true,
          opacity: baseOpacity
        });
        const hLine = new THREE.Line(hLineGeometry, hLineMaterial);
        plusGroup.add(hLine);
        
        // Vertical line
        const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -0.02, 0),
          new THREE.Vector3(0, 0.02, 0)
        ]);
        const vLineMaterial = new THREE.LineBasicMaterial({
          color: softColor,
          transparent: true,
          opacity: baseOpacity
        });
        const vLine = new THREE.Line(vLineGeometry, vLineMaterial);
        plusGroup.add(vLine);
        
        // Position the plus symbol
        plusGroup.position.set(i * gridSpacing, j * gridSpacing, -2);
        plusGroup.userData.baseOpacity = baseOpacity; // save for animation
        gridGroup.add(plusGroup);
      }
    }

    gridRef.current = gridGroup;
    scene.add(gridGroup);

    // Create parametric heart shape using the equation from the image
    const heartGroup = new THREE.Group();
    
    // Optimized heart - reduce layers for performance
    const heartCount = 3; // reduced from 5 to 3 for performance
    const m = 20; // Parameter from the equation
    
    for (let i = 0; i < heartCount; i++) {
      const points = [];
      const segments = 300;
      const scale = 1 + i * 0.08; // Slightly different scales for layered effect
      
      // Using the parametric heart equation from the image:
      // (sin(mπt/10) + x)² + (cos(mπt/10) + y)² = 0.7|x|y + 1
      // We'll create this parametrically using polar-like approach
      
      for (let j = 0; j <= segments; j++) {
        const t = (j / segments) * Math.PI * 2; // Parameter t from 0 to 2π
        
        // Heart shape parametric equations (classic heart curve)
        // x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        
        // Apply scaling and center the heart shape
        const scaledX = (x * scale * 0.02); // Slightly smaller base scale since we're scaling the group
        const scaledY = (y * scale * 0.02) + 0.2; // Offset to center the heart vertically
        
        points.push(new THREE.Vector3(scaledX, scaledY, i * 0.02));
      }
      
      const heartGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const heartMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9 - (i * 0.15),
        linewidth: 2
      });
      
      const heartLine = new THREE.Line(heartGeometry, heartMaterial);
      heartGroup.add(heartLine);
    }
    
    // Position heart centered and lowered
    heartGroup.position.set(0, -0.3, -1); // Lowered slightly to center better
    heartGroup.scale.set(9, 9, 9); // 9x larger
    heartRef.current = heartGroup;
    scene.add(heartGroup);

    // Optimized spiral - reduce circles for performance
    const spiralGroup = new THREE.Group();
    
    // Reduced circles for better performance
    const circleCount = 5; // reduced from 8 to 5
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
    
    // Position spiral behind the card (same as heart)
    spiralGroup.position.set(0, 0, -1);
    spiralGroup.scale.set(2, 2, 2); // Scale spiral appropriately
    spiralRef.current = spiralGroup;
    scene.add(spiralGroup);



    // Mouse and click handlers
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Check if mouse is near center where enlarged heart is positioned
      const distance = Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2);
      setIsHovering(distance < 0.8); // Larger hover area for bigger heart
    };

    const handleClick = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      const distance = Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2);
      if (distance < 0.8) {
        setIsHovering(prev => !prev); // Toggle on click
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

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
          
          // Smoother, more organic beating heart effect
          heartRef.current.children.forEach((child, index) => {
            const beatOffset = index * 0.3; // More varied timing for organic feel
            
            // Smoother heartbeat pattern with organic variation
            const heartbeatCycle = (time * 2.5) + beatOffset; // slower, more natural
            const beat1 = Math.sin(heartbeatCycle) * 0.5 + 0.5; // smooth sine wave
            const beat2 = Math.sin(heartbeatCycle * 1.618 + Math.PI * 0.4) * 0.3; // golden ratio variation
            const organicPulse = Math.sin(heartbeatCycle * 0.7) * 0.1; // slow organic variation
            const combinedBeat = (beat1 + beat2 + organicPulse) * 0.6;
            
            const beatScale = 1 + combinedBeat * (0.15 - index * 0.02);
            const breathingVariation = Math.sin((time * 0.8) + index * 0.5) * 0.02; // breathing effect
            
            child.scale.set(beatScale + breathingVariation, beatScale + breathingVariation, 1);
            
            // Subtle organic rotation with different frequencies
            child.rotation.z = Math.sin((time * 0.9) + index * 1.2) * 0.015 + Math.cos((time * 0.4) + index) * 0.008;
          });
        }
      }

      // Subtle grid animation with center fade for embedded card effect
      if (gridRef.current) {
        gridRef.current.rotation.z += 0.002;
        const globalPulse = (gridRef.current.userData?.pulseBase ?? 0.28) + Math.sin(time) * 0.02;

        // approximate card radius in world units - larger for better embedding effect
        const cardRadius = 3.2;

        gridRef.current.children.forEach((plusGroup) => {
          const dist = Math.hypot(plusGroup.position.x, plusGroup.position.y);
          const factor = Math.min(1, Math.max(0, (dist / cardRadius))); // 0 near center, 1 far
          const base = plusGroup.userData.baseOpacity ?? 0.8;
          const wobble = Math.sin(time + dist) * 0.02;
          // Smooth minimal fade - very subtle at center, full opacity at edges
          const targetOpacity = base * (0.05 + 0.95 * Math.pow(factor, 1.5)) + wobble;

          if (plusGroup instanceof THREE.Group) {
            plusGroup.children.forEach((line) => {
              if (line instanceof THREE.Line && line.material instanceof THREE.LineBasicMaterial) {
                // smooth approach to targetOpacity
                line.material.opacity += (targetOpacity - line.material.opacity) * 0.08;
              }
            });
          }
        });
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
      window.removeEventListener('click', handleClick);
      
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