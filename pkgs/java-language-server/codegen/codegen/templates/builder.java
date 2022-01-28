package {{ package }};

import java.io.IOException;

import com.google.gson.GsonBuilder;

public class GSONCodeGenBuilder {
  public static GsonBuilder builder() {
    GsonBuilder builder = new GsonBuilder();

    {% for clazz in classes -%}
    builder.registerTypeAdapter({{ clazz }}.class, new {{ clazz }}JsonAdapter());
    {% endfor %}
    return builder;
  }
}
