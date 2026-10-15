update public.modalities set
  what_happens = 'Conversas una hora por semana con un psicólogo o psicóloga. Cuentas lo que te pasa y esa persona te devuelve lecturas, hipótesis y preguntas. No hay técnica única: cada profesional trabaja desde su corriente. Lo que sostiene el proceso es el vínculo, y por eso los primeros encuentros son también para ver si esa persona te hace sentido.'
where slug = 'psicologia-clinica';

update public.modalities set
  what_happens = 'En vez de analizar por qué te pasa algo, el foco está en cómo te pasa en este momento: qué haces con las manos cuando lo cuentas, qué evitas mirar, qué frase se te corta. Es habitual que te propongan ejercicios en la sesión, como hablarle a una silla vacía donde ubicas a alguien de tu vida. Suena raro dicho así, y funciona por eso mismo: saca la conversación del plano de la explicación.'
where slug = 'terapia-gestalt';

update public.modalities set
  what_happens = 'Te van a pedir que notes dónde sientes algo en el cuerpo antes de explicarlo: el pecho que se cierra, la mandíbula tensa, el estómago. Se avanza despacio y en dosis pequeñas, alternando entre acercarse a lo difícil y volver a un lugar donde te sientes estable. Casi siempre se trabaja en una silla y conversando; el contacto físico, si lo hay, se acuerda antes.'
where slug = 'terapia-somatica';

update public.modalities set
  what_happens = 'Puedes ir por tu cuenta, en pareja o con tu familia. La pregunta no es quién tiene el problema sino qué hace el sistema para que el problema siga en su lugar. Se dibujan mapas del árbol familiar, se rastrean patrones que se repiten entre generaciones y se prueban cambios pequeños en cómo circula la información entre las personas.'
where slug = 'terapia-sistemica';

update public.modalities set
  what_happens = 'Se acuerdan objetivos concretos en las primeras sesiones y se trabaja hacia ellos con una agenda por encuentro. Vas a registrar situaciones, pensamientos y reacciones entre sesión y sesión, y a probar experimentos en tu vida real para comprobar si lo que supones se cumple. Es la modalidad más directiva de la lista y suele durar entre tres y seis meses.'
where slug = 'tcc';

update public.modalities set
  what_happens = 'Traes un recuerdo concreto mientras sigues con los ojos el movimiento de una mano, o recibes golpecitos alternados en las manos. Ese estímulo de lado a lado se repite en tandas cortas, con pausas para decir qué apareció. La sensación habitual es que el recuerdo pierde carga sin que hayas tenido que contarlo en detalle. No es una charla: es un protocolo con pasos.'
where slug = 'emdr';

update public.modalities set
  what_happens = 'Se trabaja sobre una situación que quieres mover: un cambio de trabajo, una conversación que vienes postergando, una decisión trabada. El foco está en cómo hablas de eso y en qué compromisos asumes para la semana siguiente. Es corto, orientado a resultados, y no es terapia: si aparece algo clínico, quien acompaña el proceso te lo dice y te deriva.'
where slug = 'coaching-ontologico';

update public.modalities set
  what_happens = 'En un taller con desconocidos, eliges personas del grupo para que ocupen el lugar de miembros de tu familia y las ubicas en el espacio. Después se observa qué pasa: quién mira a quién, quién no logra quedarse en su lugar. Es breve, muy cargado emocionalmente, y muchas veces remueve cosas que después necesitan acompañamiento. No hay evidencia clínica que lo respalde; es una práctica de tradición.'
where slug = 'constelaciones-familiares';

update public.modalities set
  what_happens = 'Alguien lee tu carta natal contigo y traduce sus figuras a preguntas sobre tu vida: qué tensión aparece una y otra vez, qué se te da fácil, qué evitas. No se predice nada ni se dice qué va a pasar. Sirve como espejo y como vocabulario para nombrar cosas que ya intuías. Es tradición simbólica, no una disciplina con evidencia clínica.'
where slug = 'astrologia-psicologica';

update public.modalities set
  what_happens = 'Se calculan unos pocos números a partir de tu nombre completo de nacimiento y tu fecha, y cada uno se lee como una imagen: el camino, lo que expresas, lo que buscas. Funciona como punto de partida para conversar sobre ti, más parecido a un test proyectivo que a un diagnóstico. Es tradición pitagórica, sin evidencia clínica.'
where slug = 'numerologia';

update public.modalities set
  what_happens = 'Se tiran unas cartas y se conversa sobre lo que sus imágenes te evocan a ti, no sobre lo que significan en un manual. La pregunta que devuelve quien acompaña suele ser «¿qué ves aquí?» antes que «esto quiere decir». La versión terapéutica se distingue de la adivinatoria justamente en eso: no habla del futuro.'
where slug = 'tarot-terapeutico';

update public.modalities set
  what_happens = 'Te acuestas con tu ropa en una camilla y la persona apoya las manos sobre distintas zonas del cuerpo, o las mantiene apenas por encima, durante unos cuarenta minutos. Casi no se habla. Lo que reportan quienes lo practican es calor, hormigueo o sueño profundo. No hay evidencia de un mecanismo energético; lo que sí está documentado es el efecto de una hora de descanso, contacto y atención.'
where slug = 'reiki';

update public.modalities set
  what_happens = 'A diferencia de una clase general, se arma una secuencia corta para ti y para algo puntual: dormir mejor, aflojar la espalda, bajar la activación. Se trabaja despacio, con posturas sostenidas y atención a la respiración, y la idea es que después la practiques en casa por tu cuenta en diez o quince minutos.'
where slug = 'yoga-terapeutico';

update public.modalities set
  what_happens = 'Aprendes a llevar la atención a algo concreto — la respiración, el cuerpo, los sonidos — y a volver ahí cada vez que la cabeza se va. Eso es toda la práctica: irse y volver, sin castigo. Los programas estructurados duran ocho semanas con un encuentro grupal por semana y práctica diaria de diez a treinta minutos. Es de lo más estudiado de esta lista.',
  contraindications = array['En trauma no procesado, la atención sostenida al cuerpo puede activar más de lo esperado: conviene empezar con acompañamiento.']::text[]
where slug = 'mindfulness-meditacion';

update public.modalities set
  what_happens = 'Con los ojos cerrados y una voz que te guía, entras en un estado de concentración parecido al de perderte en una película. No pierdes el control ni la conciencia, y puedes interrumpir cuando quieras. Desde ahí se trabaja con sugestiones acordadas de antemano o se revisan escenas concretas. Tiene evidencia para dolor, hábitos y ansiedad específica.'
where slug = 'hipnosis';

update public.modalities set
  what_happens = 'Un grupo de personas se mueve con música en una sala, siguiendo consignas simples: caminar, encontrarse, detenerse. No hay pasos que aprender y no se baila para nadie. Hay ejercicios que incluyen contacto con otros, siempre opcionales. Lo que se busca es vitalidad y salir del registro mental, no interpretar nada.',
  contraindications = array['Si el contacto físico con desconocidos te resulta difícil, avísalo antes: todo ejercicio es opcional.']::text[]
where slug = 'biodanza';

update public.modalities set
  what_happens = 'En una entrevista de una hora se conversa sobre cómo estás y se arma una mezcla de unos pocos preparados florales que tomas en gotas durante algunas semanas. Después se revisa y se ajusta. Los ensayos controlados no encuentran efecto más allá del placebo; lo que sí hay es una conversación pautada sobre tu estado emocional cada tantas semanas.'
where slug = 'flores-de-bach';

update public.modalities set
  short_description = 'Sesión receptiva: te acuestas y escuchas.',
  what_happens = 'Te acuestas con una manta y alguien hace sonar cuencos, gongs o campanas alrededor de la sala durante unos cuarenta minutos. No tienes que hacer nada. La mayoría se duerme o entra en un estado entre la vigilia y el sueño. Las frecuencias específicas que se nombran no tienen respaldo, pero el efecto de pasar cuarenta minutos en quietud, escuchando, es real.'
where slug = 'sound-healing';

update public.modalities set
  what_happens = 'Se practican patrones concretos de respiración durante unos minutos: alargar la exhalación, sostener el aire, contar tiempos. Con eso solo el cuerpo cambia de estado en cuestión de minutos, y es de lo más fácil de llevarse a casa. Las versiones intensas y prolongadas, del tipo holotrópico, son otra cosa: no se practican por cuenta propia y requieren acompañamiento.'
where slug = 'breathwork';

update public.modalities set
  what_happens = 'Es un taller de varias horas, en grupo y con terapeutas y guías con formación. Se respira más rápido y más profundo de lo habitual durante un período largo, en el suelo sobre una colchoneta y con música intensa. Se trabaja de a dos: una persona respira mientras la otra la acompaña, y después se intercambian. Esa respiración sostenida cambia el estado de conciencia y puede traer emociones, recuerdos o sensaciones físicas fuertes y difíciles de anticipar. Al final se dibuja o se conversa sobre lo vivido, y lo que se mueve ahí suele necesitar acompañamiento en los días siguientes.'
where slug = 'breathwork-holotropico';
