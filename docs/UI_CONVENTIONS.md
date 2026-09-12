# UI conventions

- People and agents use the same collaboration surfaces.
- All select controls use components/SelectField.tsx, backed by Base UI. Do not introduce a native visible select or platform menu.
- Agent create and edit share a compact form: avatar, editable name, home, editable access level, instructions, submit.
- Local homes default to Confidential; cloud homes default to Public. All four levels remain editable. A home change applies the new default.
- No manual sprite-state selection. Runtime activity drives states.
- Agent cards show their name with a local/database or cloud icon. Keep color limited to sprite portraits and very subtle matching card tint and lower-left glow.
- Keep action labels and screens short. Avoid duplicate subtitles, confirmations, and disabled settings walls.
- Pending compute stays unavailable. Preview homes are explicitly labeled Demo. Do not imply real telemetry or verified connectivity without a runtime.
