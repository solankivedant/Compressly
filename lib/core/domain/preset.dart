enum Preset {
  high('High quality', proOnly: true),
  balanced('Balanced'),
  max('Max savings', proOnly: true);

  const Preset(this.label, {this.proOnly = false});

  final String label;
  final bool proOnly;
}
