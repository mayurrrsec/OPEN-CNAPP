# How to use the OpenCNAPP architecture/plan idea

1. Open the architecture sources:
   - `raw cnapp idea/opencnapp_final_spec_v3.md`
   - `raw cnapp idea/opencnapp_final_plan_v3.html`
   - diagrams in `raw cnapp idea/cnapp_architecture.svg` and `raw cnapp idea/opencnapp_architecture.png`
2. Use `docs/roadmap-gap-analysis.md` to see delivered vs remaining roadmap tasks.
3. Use plugin model for new scanners:
   - create `plugins/<tool>/plugin.yaml`
   - implement `api/adapters/<tool>.py`
4. Use connector model for cloud/native sources.
5. Use `scripts/setup_opencnapp.sh` for one-command deployment.
6. Use profiles for optional modules:
   - runtime: Falco/Falcosidekick
   - ciem: BloodHound/AzureHound
