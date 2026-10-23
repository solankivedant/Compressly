/// Injectable time source so logic stays testable.
class Clock {
  const Clock();

  DateTime now() => DateTime.now();
}
