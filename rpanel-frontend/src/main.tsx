import { render } from "preact"; // Preact 渲染函数，用来挂载根组件
import App from "./app";         // 默认导入 App（因为 app.tsx 用的是 export default）

// 把 App 组件渲染到 index.html 里的 <div id="app"></div>
render(<App />, document.getElementById("app")!);
