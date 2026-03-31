# CI/CD snippets (Phase 2)

## GitHub Actions (Trivy + Gitleaks + Checkov -> OpenCNAPP)
```yaml
name: security-scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker run --rm -v $PWD:/src aquasec/trivy fs /src -f json -o trivy.json
      - run: docker run --rm -v $PWD:/src zricethezav/gitleaks:latest detect --source=/src --report-format json --report-path gitleaks.json
      - run: docker run --rm -v $PWD:/src bridgecrew/checkov -d /src -o json > checkov.json
      - run: |
          curl -X POST "$OPENCNAPP_URL/ingest/trivy" -H "Content-Type: application/json" --data-binary @trivy.json
          curl -X POST "$OPENCNAPP_URL/ingest/gitleaks" -H "Content-Type: application/json" --data-binary @gitleaks.json
          curl -X POST "$OPENCNAPP_URL/ingest/checkov" -H "Content-Type: application/json" --data-binary @checkov.json
```

## Azure DevOps (Grype/Syft -> OpenCNAPP)
```yaml
trigger:
- main
pool:
  vmImage: ubuntu-latest
steps:
- script: |
    curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    syft dir:. -o json > syft.json
    grype dir:. -o json > grype.json
  displayName: Run Syft/Grype
- script: |
    curl -X POST "$(OPENCNAPP_URL)/ingest/syft" -H "Content-Type: application/json" --data-binary @syft.json
    curl -X POST "$(OPENCNAPP_URL)/ingest/grype" -H "Content-Type: application/json" --data-binary @grype.json
  displayName: Push findings to OpenCNAPP
```
