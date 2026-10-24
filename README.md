# dsh-reasoning-slider

给 **DSH（DeepSeek Harness）** Web 端的模型选择器加一条可视化的「思考强度」滑条：吸附到模型支持的推理档位，最高档带蓝紫渐变和白色粒子。

## 功能

- 在模型选择弹层里内嵌一条滑条，替换原来的「推理等级」行；
- 档位来自模型 catalog 的 `reasoning.efforts`，支持任意档数（2–6 档）；
- 拖动时档位名、圆点、进度实时联动，松手吸附到最近的档位并提交；
- 最高档（Max / 最高等级）显示蓝紫渐变，并有白色粒子从左向右流动；
- 最高档在「思考强度」行中间显示额度提示文案；
- 跟随 DSH 主题（深色 / 浅色）与系统「减少动态效果」设置；
- 中英文双语。

## 安装

在 DSH 的「插件管理」里添加本地 bundle，选择本目录；或使用 `plugin_manager` 的 `install_bundle` 指向本目录：

```powershell
# 示例：在 DSH 会话中
# plugin_manager action=install_bundle target=<本目录绝对路径>
```

安装后刷新页面生效。

## 兼容性

- DSH 0.2.x（Web 端）
- 通过 shadow `conversation.input.model`（`priority: -1`）实现，最低优先级渲染

## 许可

MIT
