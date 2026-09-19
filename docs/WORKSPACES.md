# Discovery in MARS v0.7

The old optional `mars-workspace.yml` mechanism remains readable during migration, but the preferred discovery mechanism is now the registry.

Register any number of roots:

```bash
cd ~/Courses
mars park

cd ~/Conferences
mars park
```

Then:

```bash
mars paths
mars list
mars open deep-learning
```

Each direct child containing `mars.yml` is treated as a Stack.
