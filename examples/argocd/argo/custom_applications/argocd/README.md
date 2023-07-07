# argocd

This directory contains a Gateway resource for ArgoCD,
so that the ArgoCD GUI can be accessed without using `kubectl port-forward`,
as well as a plugin for ArgoCD so that it can parse and install cdk8s charts.

This directory also includes a custom `argocd-ssh-known-hosts-cm` Configmap in `ssh-known-hosts-cm.yaml`,
that includes SSH host keys for Codeberg.org, which are not installed by default.

If you want to store your git repository credentials declaratively, you can include them here.
See [ArgoCD's documentation about declarative configuration for git repositories](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#repositories).