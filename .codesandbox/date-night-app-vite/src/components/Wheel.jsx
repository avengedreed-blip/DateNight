diff --git a/.codesandbox/date-night-app-vite/src/components/Wheel.jsx b/.codesandbox/date-night-app-vite/src/components/Wheel.jsx
index c24dec7acf586323da9251e0e0dcbdd9138cf967..5dd56b808048b1c09a13750f247cb8c2a72f722e 100644
--- a/.codesandbox/date-night-app-vite/src/components/Wheel.jsx
+++ b/.codesandbox/date-night-app-vite/src/components/Wheel.jsx
@@ -1,26 +1,54 @@
-import React from "react";
+import React, { useMemo } from "react";
+
+const Wheel = ({ rotation, isExtremeRound, segments, children }) => {
+  const gradient = useMemo(() => {
+    if (!segments?.length) {
+      return undefined;
+    }
+
+    const sliceSize = 360 / segments.length;
+    const stops = segments
+      .map((segment, index) => {
+        const start = index * sliceSize;
+        const end = (index + 1) * sliceSize;
+        return `${segment.color} ${start}deg ${end}deg`;
+      })
+      .join(", ");
+
+    return `conic-gradient(${stops})`;
+  }, [segments]);
+
+  const labels = useMemo(
+    () =>
+      segments?.map((segment, index) => ({
+        id: segment.id ?? segment.label ?? index,
+        label: segment.label ?? segment.title ?? segment.id ?? `Segment ${index + 1}`,
+        angle: (index * 360) / segments.length + 180 / segments.length,
+      })) ?? [],
+    [segments]
+  );
 
-const Wheel = ({ rotation, isExtremeRound }) => {
-  const wheelSlices = ["TRUTH", "DARE", "TRIVIA"];
   return (
-    <div className="wheel-container">
+    <div className="wheel-wrapper">
       <div
-        className={`wheel ${isExtremeRound ? "extreme" : ""}`}
-        style={{ transform: `rotate(${rotation}deg)` }}
-      >
-        {wheelSlices.map((slice, index) => (
-          <div
-            key={slice}
-            className="wheel-label"
-            style={{ transform: `rotate(${index * 120 + 60}deg)` }}
+        className={`wheel ${isExtremeRound ? "wheel--extreme" : ""}`}
+        style={{ transform: `rotate(${rotation}deg)`, background: gradient }}
+      />
+      <div className="wheel__labels">
+        {labels.map((item) => (
+          <span
+            key={item.id}
+            className="wheel__label"
+            style={{ transform: `rotate(${item.angle}deg)` }}
           >
-            <span>{slice}</span>
-          </div>
+            {item.label}
+          </span>
         ))}
       </div>
-      <div className={`pointer ${isExtremeRound ? "extreme" : ""}`}>▼</div>
+      <div className={`wheel__pointer ${isExtremeRound ? "wheel__pointer--extreme" : ""}`}>▼</div>
+      {children}
     </div>
   );
 };
 
 export default Wheel;
